export type WorkspaceFile = {
  id: string
  name: string
  path: string
  content: string
}

export type WorkspaceData = {
  files: WorkspaceFile[]
  activeFileId: string
  openFileIds: string[]
}