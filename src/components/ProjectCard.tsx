"use client"

import type { GitHubRepo } from "@/types"
import { GitFork, Lock, Globe, Clock, FileText } from "lucide-react"
import Link from "next/link"

interface ProjectCardProps {
  repo: GitHubRepo
}

export default function ProjectCard({ repo }: ProjectCardProps) {
  const timeAgo = repo.updated_at ? getTimeAgo(new Date(repo.updated_at)) : "unknown"

  return (
    <Link
      href={`/editor/${repo.full_name}`}
      className="group block p-4 rounded-xl bg-bg-secondary border border-border-primary hover:border-border-accent hover:bg-bg-tertiary transition-all duration-200 animate-slide-up"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
            <FileText size={16} className="text-accent" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-medium text-text-primary truncate group-hover:text-accent transition-colors">
              {repo.name}
            </h3>
            <p className="text-xs text-text-tertiary truncate">
              {repo.full_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {repo.private ? (
            <Lock size={12} className="text-text-tertiary" />
          ) : (
            <Globe size={12} className="text-text-tertiary" />
          )}
        </div>
      </div>

      {repo.description && (
        <p className="text-xs text-text-secondary line-clamp-2 mb-3 leading-relaxed">
          {repo.description}
        </p>
      )}

      <div className="flex items-center gap-3 text-xs text-text-tertiary">
        {repo.language && (
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-accent" />
            {repo.language}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock size={11} />
          {timeAgo}
        </span>
      </div>
    </Link>
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
