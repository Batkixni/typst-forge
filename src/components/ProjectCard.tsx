"use client"

import type { LocalProject } from "@/types"
import { Clock, FileText, GitBranch, HardDrive, Trash2 } from "lucide-react"
import Link from "next/link"

interface ProjectCardProps {
  project: LocalProject
  onDelete?: () => void
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const timeAgo = project.updatedAt
    ? getTimeAgo(new Date(project.updatedAt))
    : "unknown"

  return (
    <div className="group relative p-4 rounded-xl bg-bg-secondary border border-border-primary hover:border-border-accent hover:bg-bg-tertiary transition-all duration-200 animate-slide-up">
      <Link href={`/editor/${project.id}`} className="block">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
              <FileText size={16} className="text-accent" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">
                {project.name}
              </h3>
              <p className="text-xs text-text-tertiary truncate flex items-center gap-1">
                {project.git ? (
                  <>
                    <GitBranch size={10} />
                    {project.git.owner}/{project.git.repo}
                  </>
                ) : (
                  <>
                    <HardDrive size={10} />
                    Local only
                  </>
                )}
              </p>
            </div>
          </div>
        </div>

        {project.description && (
          <p className="text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed">
            {project.description}
          </p>
        )}

        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent" />
            Typst
          </span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {timeAgo}
          </span>
        </div>
      </Link>

      {onDelete && (
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onDelete()
          }}
          className="absolute top-3 right-3 p-1.5 rounded-md text-text-tertiary opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-bg-hover transition-all"
          title="Delete project"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  )
}

function getTimeAgo(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return "today"
  if (diffDays === 1) return "yesterday"
  if (diffDays < 30) return `${diffDays}d ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}
