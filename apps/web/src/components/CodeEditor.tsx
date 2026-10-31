
import { useEffect, useRef } from 'react'
import { EditorView, basicSetup } from 'codemirror'
import { javascript } from '@codemirror/lang-javascript'

type CodeEditorProps = {
  initialValue?: string
  onChange?: (value: string) => void
}

const defaultCode = `// Welcome to TraceForge
// Your code editor is now ready!

type Developer = {
  name: string
  role: string
}

function welcome(user: Developer): string {
  return \`Hello, \${user.name}! Welcome to TraceForge.\`
}

const developer: Developer = {
  name: "Developer",
  role: "Software Engineer"
}

console.log(welcome(developer))
`

function CodeEditor({
  initialValue = defaultCode,
  onChange,
}: CodeEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null)

  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!editorRef.current) return

    const editor = new EditorView({
      doc: initialValue,

      extensions: [
        basicSetup,

        javascript({
          typescript: true,
          jsx: true,
        }),

        EditorView.theme({
          '&': {
            height: '100%',
            fontSize: '13px',
            backgroundColor: 'transparent',
            color: '#1e293b',
          },

          '&.cm-focused': {
            outline: 'none',
          },

          '.cm-scroller': {
            fontFamily: '"JetBrains Mono", "Cascadia Code", monospace',
            overflow: 'auto',
          },

          '.cm-content': {
            padding: '18px 0',
            minHeight: '100%',
          },

          '.cm-line': {
            padding: '0 16px',
          },

          '.cm-gutters': {
            backgroundColor: 'rgba(248, 250, 252, 0.75)',
            color: '#94a3b8',
            border: 'none',
            borderRight: '1px solid #e2e8f0',
          },

          '.cm-activeLine': {
            backgroundColor: 'rgba(224, 242, 254, 0.55)',
          },

          '.cm-activeLineGutter': {
            backgroundColor: '#e0f2fe',
            color: '#0369a1',
          },

          '.cm-cursor': {
            borderLeftColor: '#0284c7',
          },

          '.cm-selectionBackground': {
            backgroundColor: '#bae6fd',
          },
        }),

        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeRef.current?.(update.state.doc.toString())
          }
        }),
      ],

      parent: editorRef.current,
    })

    return () => {
      editor.destroy()
    }
  }, [initialValue])

  return (
    <div
      ref={editorRef}
      className="h-full min-h-0 w-full overflow-hidden"
    />
  )
}

export default CodeEditor
