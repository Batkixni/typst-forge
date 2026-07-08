import { Octokit } from "@octokit/rest"
import type { GitHubRepo, RepoFile, ProjectFile } from "@/types"

function decodeBase64(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "base64").toString("utf-8")
  }
  try {
    return decodeURIComponent(
      atob(str)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    )
  } catch {
    return atob(str)
  }
}

export function getOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken })
}

export async function listRepos(accessToken: string): Promise<GitHubRepo[]> {
  const octokit = getOctokit(accessToken)
  const { data } = await octokit.repos.listForAuthenticatedUser({
    sort: "updated",
    per_page: 50,
    type: "all",
  })
  return data.map((repo) => ({
    id: repo.id,
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    private: repo.private,
    html_url: repo.html_url,
    default_branch: repo.default_branch,
    updated_at: repo.updated_at,
    language: repo.language,
  }))
}

export async function createTypstRepo(
  accessToken: string,
  name: string,
  description: string,
  isPrivate: boolean
): Promise<string> {
  const octokit = getOctokit(accessToken)
  const { data: repo } = await octokit.repos.createForAuthenticatedUser({
    name,
    description,
    private: isPrivate,
    auto_init: true,
  })
  const initial = `= ${name}\n\n# Hello, Typst!\n`
  await octokit.repos.createOrUpdateFileContents({
    owner: repo.owner.login,
    repo: repo.name,
    path: "main.typ",
    message: "Initialize Typst project",
    content: Buffer.from(initial, "utf-8").toString("base64"),
  })
  return repo.full_name
}

export async function getRepoContents(
  accessToken: string,
  owner: string,
  repo: string,
  path: string = ""
): Promise<RepoFile[]> {
  const octokit = getOctokit(accessToken)
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
  })
  if (Array.isArray(data)) {
    return data.map((item) => ({
      name: item.name,
      path: item.path,
      type: item.type as "file" | "dir",
      sha: item.sha,
      size: item.size,
    }))
  }
  return [
    {
      name: data.name,
      path: data.path,
      type: data.type as "file" | "dir",
      sha: data.sha,
      size: data.size,
      content: "content" in data ? decodeBase64(data.content || "") : "",
    },
  ]
}

async function buildFileTreeRecursive(
  accessToken: string,
  owner: string,
  repo: string,
  path: string = ""
): Promise<ProjectFile[]> {
  const items = await getRepoContents(accessToken, owner, repo, path)
  const tree: ProjectFile[] = []

  for (const item of items) {
    if (item.type === "dir") {
      const children = await buildFileTreeRecursive(
        accessToken,
        owner,
        repo,
        item.path
      )
      tree.push({ ...item, children })
    } else {
      tree.push(item)
    }
  }

  tree.sort((a, b) => {
    if (a.type !== b.type) return a.type === "dir" ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return tree
}

export async function getFileTree(
  accessToken: string,
  owner: string,
  repo: string
): Promise<ProjectFile[]> {
  return buildFileTreeRecursive(accessToken, owner, repo)
}

export async function commitFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string
): Promise<void> {
  const octokit = getOctokit(accessToken)
  const { data } = await octokit.repos.getContent({ owner, repo, path }).catch(() => ({ data: null as any }))
  const sha = data?.sha

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: Buffer.from(content, "utf-8").toString("base64"),
    sha,
  })
}

export async function commitBinaryFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  base64Content: string,
  message: string
): Promise<void> {
  const octokit = getOctokit(accessToken)
  const { data } = await octokit.repos.getContent({ owner, repo, path }).catch(() => ({ data: null as any }))
  const sha = data?.sha

  await octokit.repos.createOrUpdateFileContents({
    owner,
    repo,
    path,
    message,
    content: base64Content,
    sha,
  })
}

export async function deleteFile(
  accessToken: string,
  owner: string,
  repo: string,
  path: string,
  message: string
): Promise<void> {
  const octokit = getOctokit(accessToken)
  const { data } = await octokit.repos.getContent({ owner, repo, path })
  if (Array.isArray(data)) throw new Error("Cannot delete directory via this method")
  await octokit.repos.deleteFile({
    owner,
    repo,
    path,
    message,
    sha: data.sha,
  })
}

export async function renameFile(
  accessToken: string,
  owner: string,
  repo: string,
  oldPath: string,
  newPath: string,
  message: string
): Promise<void> {
  const octokit = getOctokit(accessToken)

  const { data: fileData } = await octokit.repos.getContent({ owner, repo, path: oldPath })
  if (Array.isArray(fileData) || fileData.type !== "file") throw new Error("Cannot rename a directory or symlink")

  const { data: refData } = await octokit.git.getRef({ owner, repo, ref: "heads/main" })
  const currentCommitSha = refData.object.sha

  const { data: commitData } = await octokit.git.getCommit({ owner, repo, commit_sha: currentCommitSha })
  const baseTreeSha = commitData.tree.sha

  const { data: blobData } = await octokit.git.createBlob({
    owner,
    repo,
    content: fileData.content,
    encoding: "base64",
  })

  const { data: newTreeData } = await octokit.git.createTree({
    owner,
    repo,
    base_tree: baseTreeSha,
    tree: [
      { path: oldPath, mode: "100644", type: "blob", sha: null },
      { path: newPath, mode: "100644", type: "blob", sha: blobData.sha },
    ],
  })

  const { data: newCommitData } = await octokit.git.createCommit({
    owner,
    repo,
    message,
    tree: newTreeData.sha,
    parents: [currentCommitSha],
  })

  await octokit.git.updateRef({
    owner,
    repo,
    ref: "heads/main",
    sha: newCommitData.sha,
  })
}

export async function getFileContent(
  accessToken: string,
  owner: string,
  repo: string,
  path: string
): Promise<string> {
  const octokit = getOctokit(accessToken)
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path,
  })
  if (!Array.isArray(data) && "content" in data && data.content) {
    return decodeBase64(data.content)
  }
  throw new Error("Not a file")
}

export async function getFileBlob(
  accessToken: string,
  owner: string,
  repo: string,
  path: string
): Promise<Blob> {
  const octokit = getOctokit(accessToken)
  const { data } = await octokit.repos.getContent({ owner, repo, path })
  if (Array.isArray(data)) throw new Error("Not a file")
  if (!("content" in data) || !data.content) throw new Error("No content")
  const raw = data.content.replace(/\n/g, "")
  const binaryStr = atob(raw)
  const bytes = new Uint8Array(binaryStr.length)
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i)
  const ext = path.split(".").pop()?.toLowerCase()
  const mime: Record<string, string> = {
    png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
    gif: "image/gif", svg: "image/svg+xml", webp: "image/webp",
    pdf: "application/pdf",
  }
  return new Blob([bytes], { type: mime[ext || ""] || "" })
}
