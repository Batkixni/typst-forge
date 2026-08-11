import { getServerSession, getAccessToken } from "@/lib/auth"
import {
  assertProjectOwned,
  getUserId,
  listAllFiles,
  projectDir,
  readBinaryFile,
  writeBinaryFile,
  writeMeta,
  writeTextFile,
} from "@/lib/projects"
import { getOctokit, getFileTree, getFileBytes } from "@/lib/github"
import { NextRequest, NextResponse } from "next/server"
import type { ProjectFile } from "@/types"

/**
 * Git is optional. Bind / unbind / import (pull) / push (manual commit).
 * Local storage remains source of truth; GitHub is a remote mirror when bound.
 */

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession()
  const userId = getUserId(session)
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const accessToken = getAccessToken(session?.session)
  const { id } = await params

  try {
    const meta = assertProjectOwned(userId, id)
    const body = await req.json()
    const action = body.action as string

    if (action === "bind") {
      if (!accessToken) {
        return NextResponse.json({ error: "GitHub token required to bind" }, { status: 401 })
      }
      const owner = String(body.owner || "").trim()
      const repo = String(body.repo || "").trim()
      const branch = String(body.branch || "main").trim() || "main"
      if (!owner || !repo) {
        return NextResponse.json({ error: "owner and repo required" }, { status: 400 })
      }

      // Verify repo exists
      const octokit = getOctokit(accessToken)
      const { data: ghRepo } = await octokit.repos.get({ owner, repo })
      meta.git = {
        owner,
        repo,
        branch: branch || ghRepo.default_branch || "main",
        htmlUrl: ghRepo.html_url,
      }
      meta.updatedAt = new Date().toISOString()
      writeMeta(userId, id, meta)
      return NextResponse.json(meta)
    }

    if (action === "unbind") {
      meta.git = null
      meta.updatedAt = new Date().toISOString()
      writeMeta(userId, id, meta)
      return NextResponse.json(meta)
    }

    if (action === "import" || action === "pull") {
      // Pull remote into local (overwrites local files that exist remotely)
      if (!accessToken) {
        return NextResponse.json({ error: "GitHub token required" }, { status: 401 })
      }
      let owner = body.owner as string | undefined
      let repo = body.repo as string | undefined
      let branch = body.branch as string | undefined

      if (action === "pull") {
        if (!meta.git) {
          return NextResponse.json({ error: "Project is not bound to GitHub" }, { status: 400 })
        }
        owner = meta.git.owner
        repo = meta.git.repo
        branch = meta.git.branch
      }

      if (!owner || !repo) {
        return NextResponse.json({ error: "owner and repo required" }, { status: 400 })
      }

      const tree = await getFileTree(accessToken, owner, repo)
      await materializeTree(userId, id, tree, accessToken, owner, repo)

      if (action === "import" || !meta.git) {
        const octokit = getOctokit(accessToken)
        const { data: ghRepo } = await octokit.repos.get({ owner, repo })
        meta.git = {
          owner,
          repo,
          branch: branch || ghRepo.default_branch || "main",
          htmlUrl: ghRepo.html_url,
        }
      }
      meta.updatedAt = new Date().toISOString()
      writeMeta(userId, id, meta)
      return NextResponse.json(meta)
    }

    if (action === "push" || action === "commit") {
      // Manual push of entire local project to bound GitHub repo
      if (!accessToken) {
        return NextResponse.json({ error: "GitHub token required" }, { status: 401 })
      }
      if (!meta.git) {
        return NextResponse.json(
          { error: "Bind a GitHub repository first to enable commits" },
          { status: 400 }
        )
      }

      const message = (body.message as string)?.trim() || `Update from Typst Forge`
      const { owner, repo, branch } = meta.git
      const files = listAllFiles(userId, id)
      if (files.length === 0) {
        return NextResponse.json({ error: "No files to push" }, { status: 400 })
      }

      await pushAllFiles(accessToken, owner, repo, branch, userId, id, files, message)
      meta.updatedAt = new Date().toISOString()
      writeMeta(userId, id, meta)
      return NextResponse.json({ ok: true, files: files.length, message })
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (error: any) {
    console.error("Git action failed:", error)
    return NextResponse.json(
      { error: error.message || "Git action failed" },
      { status: 500 }
    )
  }
}

async function materializeTree(
  userId: string,
  projectId: string,
  tree: ProjectFile[],
  accessToken: string,
  owner: string,
  repo: string
) {
  const TEXT_EXT = new Set([
    "typ", "txt", "md", "json", "toml", "yaml", "yml", "css", "html", "js", "ts",
    "tsx", "jsx", "bib", "csv", "svg", "gitignore", "editorconfig",
  ])
  const FONT_EXT = new Set(["ttf", "otf", "woff", "woff2", "pfb", "pfm", "ttc", "otc"])

  async function walk(nodes: ProjectFile[]) {
    for (const node of nodes) {
      if (node.type === "dir" && node.children) {
        await walk(node.children)
      } else if (node.type === "file") {
        try {
          const buf = await getFileBytes(accessToken, owner, repo, node.path)
          const ext = node.name.includes(".")
            ? node.name.split(".").pop()!.toLowerCase()
            : ""

          // Fonts / binaries always as binary (never UTF-8 round-trip)
          if (FONT_EXT.has(ext) || (!TEXT_EXT.has(ext) && !node.name.startsWith("."))) {
            // Detect Git LFS pointer masquerading as a font
            const head = buf.subarray(0, 80).toString("utf-8")
            if (
              FONT_EXT.has(ext) &&
              head.startsWith("version https://git-lfs.github.com/spec/")
            ) {
              console.warn(
                `[git import] ${node.path} is a Git LFS pointer — real font not downloaded. Enable LFS or upload fonts manually.`
              )
            }
            writeBinaryFile(userId, projectId, node.path, buf)
          } else {
            writeTextFile(userId, projectId, node.path, buf.toString("utf-8"))
          }
        } catch (e) {
          console.warn("Skip file", node.path, e)
        }
      }
    }
  }
  await walk(tree)
}

/** Push all local files using Git Data API (single commit) */
async function pushAllFiles(
  accessToken: string,
  owner: string,
  repo: string,
  branch: string,
  userId: string,
  projectId: string,
  files: string[],
  message: string
) {
  const octokit = getOctokit(accessToken)
  const ref = `heads/${branch}`

  let baseCommitSha: string
  let baseTreeSha: string
  try {
    const { data: refData } = await octokit.git.getRef({ owner, repo, ref })
    baseCommitSha = refData.object.sha
    const { data: commitData } = await octokit.git.getCommit({
      owner,
      repo,
      commit_sha: baseCommitSha,
    })
    baseTreeSha = commitData.tree.sha
  } catch {
    // Empty repo — create initial commit without base
    baseCommitSha = ""
    baseTreeSha = ""
  }

  const treeItems: {
    path: string
    mode: "100644"
    type: "blob"
    sha: string
  }[] = []

  for (const filePath of files) {
    const buf = readBinaryFile(userId, projectId, filePath)
    const { data: blob } = await octokit.git.createBlob({
      owner,
      repo,
      content: buf.toString("base64"),
      encoding: "base64",
    })
    treeItems.push({
      path: filePath,
      mode: "100644",
      type: "blob",
      sha: blob.sha,
    })
  }

  const { data: newTree } = await octokit.git.createTree({
    owner,
    repo,
    tree: treeItems,
    ...(baseTreeSha ? { base_tree: baseTreeSha } : {}),
  })

  const { data: newCommit } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: newTree.sha,
    ...(baseCommitSha ? { parents: [baseCommitSha] } : {}),
  })

  try {
    await octokit.git.updateRef({
      owner,
      repo,
      ref,
      sha: newCommit.sha,
      force: false,
    })
  } catch {
    // Ref may not exist yet
    await octokit.git.createRef({
      owner,
      repo,
      ref: `refs/${ref}`,
      sha: newCommit.sha,
    })
  }
}
