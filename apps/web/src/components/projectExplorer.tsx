
import { useState, type FormEvent } from 'react'
import {
  FileCode2,
  FilePlus2,
  FolderOpen,
  X,
} from 'lucide-react'
import type { WorkspaceFile } from '../types/workspace'

type ProjectExplorerProps = {
  files: WorkspaceFile[]
  activeFileId: string
  onOpenFile: (fileId: string) => void
  onCreateFile: (fileName: string) => void
}

function ProjectExplorer({
  files,
  activeFileId,
  onOpenFile,
  onCreateFile,
}: ProjectExplorerProps) {
  const [isCreating, setIsCreating] = useState(false)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')

  // Handle the file creation form.
  function handleCreateFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmedName = fileName.trim()

    // Check for an empty filename.
    if (!trimmedName) {
      setError('Please enter a file name.')
      return
    }

    // Prevent path separators and invalid filename characters.
    const hasInvalidCharacter = [...trimmedName].some((character) => {
  const code = character.charCodeAt(0)

  return (
    '<>:"/\\|?*'.includes(character) ||
    code <= 31
  )
})

if (
  hasInvalidCharacter ||
  trimmedName === '.' ||
  trimmedName === '..'
) {
  setError('Please enter a valid file name.')
  return
}

    // Prevent duplicate filenames.
    const alreadyExists = files.some(
      (file) => file.name.toLowerCase() === trimmedName.toLowerCase(),
    )

    if (alreadyExists) {
      setError('A file with this name already exists.')
      return
    }

    // Ask the parent component to create the file.
    onCreateFile(trimmedName)

    // Reset the form.
    setFileName('')
    setError('')
    setIsCreating(false)
  }

  // Close the creation form.
  function handleCancelCreate() {
    setFileName('')
    setError('')
    setIsCreating(false)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">

      {/* Explorer header */}
      <div className="flex h-12 shrink-0 items-center justify-between px-4">

        <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-500">
          Explorer
        </span>

        <button
          type="button"
          title="Create new file"
          onClick={() => {
            setIsCreating(true)
            setError('')
          }}
          className="rounded-md p-1.5 text-slate-400 transition hover:bg-sky-100 hover:text-sky-700"
        >
          <FilePlus2 size={16} />
        </button>

      </div>

      {/* Project folder */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2">

        <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-slate-600">
          <FolderOpen size={15} className="text-sky-600" />
          traceforge-ide
        </div>

        {/* Source folder */}
        <div className="ml-3 border-l border-slate-200 pl-3">

          <div className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-medium text-slate-500">
            <FolderOpen size={14} className="text-sky-500" />
            src
          </div>

          {/* New file form */}
          {isCreating && (
            <form
              onSubmit={handleCreateFile}
              className="mb-2 ml-2 rounded-lg border border-sky-200 bg-white/80 p-2 shadow-sm"
            >

              <label
                htmlFor="new-workspace-file"
                className="mb-2 block text-[10px] font-semibold text-slate-600"
              >
                New file name
              </label>

              <input
                id="new-workspace-file"
                type="text"
                value={fileName}
                onChange={(event) => {
                  setFileName(event.target.value)
                  setError('')
                }}
                placeholder="example.ts"
                autoFocus
                className="w-full rounded-md border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              />

              {error && (
                <p className="mt-1.5 text-[10px] text-rose-600">
                  {error}
                </p>
              )}

              <div className="mt-2 flex items-center gap-2">

                <button
                  type="submit"
                  className="flex-1 rounded-md bg-sky-600 px-2 py-1.5 text-[10px] font-semibold text-white transition hover:bg-sky-700"
                >
                  Create
                </button>

                <button
                  type="button"
                  onClick={handleCancelCreate}
                  className="rounded-md border border-slate-200 px-2 py-1.5 text-[10px] font-semibold text-slate-500 transition hover:bg-slate-50"
                >
                  Cancel
                </button>

              </div>
            </form>
          )}

          {/* Workspace file list */}
          <div className="space-y-1">

            {files.map((file) => {
              const isActive = file.id === activeFileId

              return (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => onOpenFile(file.id)}
                  title={file.path}
                  className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-xs transition ${
                    isActive
                      ? 'bg-sky-100 font-semibold text-sky-800'
                      : 'text-slate-500 hover:bg-white/80 hover:text-slate-800'
                  }`}
                >
                  <FileCode2
                    size={14}
                    className={
                      isActive
                        ? 'shrink-0 text-sky-600'
                        : 'shrink-0 text-slate-400'
                    }
                  />

                  <span className="min-w-0 flex-1 truncate">
                    {file.name}
                  </span>

                  {isActive && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-sky-500" />
                  )}
                </button>
              )
            })}

            {files.length === 0 && (
              <p className="px-2 py-3 text-center text-[10px] text-slate-400">
                No files in this folder yet.
              </p>
            )}

          </div>
        </div>
      </div>

      {/* Explorer footer */}
      <div className="shrink-0 border-t border-slate-200/70 px-3 py-2">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>{files.length} {files.length === 1 ? 'file' : 'files'}</span>
          <button
            type="button"
            title="Close file creation form"
            onClick={handleCancelCreate}
            className="rounded p-1 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={12} />
          </button>
        </div>
      </div>

    </div>
  )
}

export default ProjectExplorer
