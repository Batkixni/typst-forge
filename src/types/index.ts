export interface RepoFile {
  name: string
  path: string
  type: "file" | "dir"
  content?: string
  sha?: string
  size?: number
}

export interface GitHubRepo {
  id: number
  name: string
  full_name: string
  description: string | null
  private: boolean
  html_url: string
  default_branch: string
  updated_at: string | null
  language: string | null
}

export interface ProjectFile extends RepoFile {
  children?: ProjectFile[]
}

export interface EditorState {
  projectId: string | null
  files: ProjectFile[]
  currentFile: string | null
  currentContent: string
  isDirty: boolean
  previewUrl: string | null
  isCompiling: boolean
  isLoading: boolean
}
