'use client'

import { useRef, useState } from 'react'
import type { Editor } from '@tiptap/react'
import {
  Bold, Italic, Underline, Strikethrough,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered,
  Indent, Outdent,
  Link, Image, Table,
  Undo2, Redo2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MathInsertModal } from './MathInsertModal'

// ─── Constants (mirrors Angular TinyMCE config) ───────────────────────────────

const FONT_FAMILIES = [
  { label: 'Default',      value: '' },
  { label: 'Arial',        value: 'Arial, Helvetica, sans-serif' },
  { label: 'Courier New',  value: '"Courier New", Courier, monospace' },
  { label: 'Georgia',      value: 'Georgia, serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Verdana',      value: 'Verdana, Geneva, sans-serif' },
]

const FONT_SIZES = [
  '8pt','9pt','10pt','11pt','12pt','14pt','18pt',
  '24pt','30pt','36pt','48pt','60pt','72pt','96pt',
]

const LINE_HEIGHTS = [
  { label: 'Default', value: '' },
  { label: '1',    value: '1' },
  { label: '1.15', value: '1.15' },
  { label: '1.5',  value: '1.5' },
  { label: '2',    value: '2' },
  { label: '2.5',  value: '2.5' },
  { label: '3',    value: '3' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface Props { editor: Editor | null }

function Divider() {
  return <div className="mx-0.5 h-5 w-px shrink-0 bg-border" />
}

function ToolbarButton({
  onClick, active, disabled, title, children,
}: {
  onClick: () => void
  active?: boolean
  disabled?: boolean
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}
      className={cn(
        'inline-flex h-7 w-7 items-center justify-center rounded text-sm transition-colors',
        'hover:bg-muted disabled:pointer-events-none disabled:opacity-40',
        active ? 'bg-muted text-foreground' : 'text-muted-foreground',
      )}
    >
      {children}
    </button>
  )
}

function ToolbarSelect({
  value, onChange, title, className, children,
}: {
  value: string
  onChange: (v: string) => void
  title: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <select
      title={title}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onMouseDown={(e) => e.stopPropagation()}
      className={cn(
        'h-7 rounded border border-input bg-background px-1 text-xs text-foreground',
        'focus:outline-none focus:ring-1 focus:ring-ring',
        className,
      )}
    >
      {children}
    </select>
  )
}

function ColorButton({
  title, value, onChange, icon,
}: {
  title: string
  value: string
  onChange: (color: string) => void
  icon: React.ReactNode
}) {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <div className="relative inline-flex">
      <button
        type="button"
        title={title}
        onMouseDown={(e) => { e.preventDefault(); ref.current?.click() }}
        className="inline-flex h-7 w-7 flex-col items-center justify-center rounded text-muted-foreground hover:bg-muted"
      >
        {icon}
        <span
          className="mt-0.5 h-1 w-4 rounded-sm"
          style={{ background: value || '#000000' }}
        />
      </button>
      <input
        ref={ref}
        type="color"
        value={value || '#000000'}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-0 w-0 opacity-0 cursor-pointer"
      />
    </div>
  )
}

// ─── Main toolbar ─────────────────────────────────────────────────────────────

export function RichTextToolbar({ editor }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [mathModal, setMathModal] = useState<{ open: boolean; mode: 'math' | 'chemistry' }>({
    open: false,
    mode: 'math',
  })

  if (!editor) return null

  const handleMathInsert = (out: string) => {
    // Block math: $$...$$ → insertBlockMath node
    const blockMatch = out.match(/^\$\$([^]+)\$\$$/)
    if (blockMatch) {
      editor.chain().focus().insertBlockMath({ latex: blockMatch[1] }).run()
      return
    }
    // Inline math / chemistry: $...$ → insertInlineMath node
    const inlineMatch = out.match(/^\$([^]+)\$$/)
    if (inlineMatch) {
      editor.chain().focus().insertInlineMath({ latex: inlineMatch[1] }).run()
      return
    }
    editor.chain().focus().insertContent(out).run()
  }

  // ── Derived state ──────────────────────────────────────────────────────────

  const currentFontFamily = editor.getAttributes('textStyle').fontFamily ?? ''
  const currentFontSize   = editor.getAttributes('textStyle').fontSize   ?? ''
  const currentColor      = editor.getAttributes('textStyle').color      ?? ''
  const currentHighlight  = editor.getAttributes('highlight').color      ?? ''
  const currentLineHeight = (
    editor.getAttributes('paragraph').lineHeight ??
    editor.getAttributes('heading').lineHeight   ?? ''
  )

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleLink = () => {
    const prev = editor.getAttributes('link').href ?? ''
    const url  = window.prompt('Enter URL', prev)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().unsetLink().run()
    } else {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        editor.chain().focus().setImage({ src: reader.result, alt: file.name }).run()
      }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  const handleInsertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/30 px-2 py-1">

      {/* Undo / Redo */}
      <ToolbarButton title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
        <Undo2 className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
        <Redo2 className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Font family */}
      <ToolbarSelect
        title="Font family"
        value={currentFontFamily}
        onChange={(v) => v ? editor.chain().focus().setFontFamily(v).run() : editor.chain().focus().unsetFontFamily().run()}
        className="w-28"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.label} value={f.value}>{f.label}</option>
        ))}
      </ToolbarSelect>

      {/* Font size */}
      <ToolbarSelect
        title="Font size"
        value={currentFontSize}
        onChange={(v) => v ? editor.chain().focus().setFontSize(v).run() : editor.chain().focus().unsetFontSize().run()}
        className="w-16"
      >
        <option value="">Size</option>
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </ToolbarSelect>

      <Divider />

      {/* Inline formatting */}
      <ToolbarButton title="Bold (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>
        <Bold className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Italic (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>
        <Italic className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Underline (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>
        <Underline className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Strikethrough" onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive('strike')}>
        <Strikethrough className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Text colour */}
      <ColorButton
        title="Text colour"
        value={currentColor}
        onChange={(c) => editor.chain().focus().setColor(c).run()}
        icon={<span className="text-[10px] font-bold leading-none">A</span>}
      />

      {/* Background / highlight colour */}
      <ColorButton
        title="Background colour"
        value={currentHighlight}
        onChange={(c) => editor.chain().focus().setHighlight({ color: c }).run()}
        icon={<span className="text-[10px] font-bold leading-none" style={{ background: 'linear-gradient(to bottom, transparent 40%, #ffff00 40%)' }}>A</span>}
      />

      <Divider />

      {/* Alignment */}
      <ToolbarButton title="Align left" onClick={() => editor.chain().focus().setTextAlign('left').run()} active={editor.isActive({ textAlign: 'left' })}>
        <AlignLeft className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Align center" onClick={() => editor.chain().focus().setTextAlign('center').run()} active={editor.isActive({ textAlign: 'center' })}>
        <AlignCenter className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Align right" onClick={() => editor.chain().focus().setTextAlign('right').run()} active={editor.isActive({ textAlign: 'right' })}>
        <AlignRight className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Justify" onClick={() => editor.chain().focus().setTextAlign('justify').run()} active={editor.isActive({ textAlign: 'justify' })}>
        <AlignJustify className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Indent / outdent */}
      <ToolbarButton title="Outdent" onClick={() => editor.chain().focus().liftListItem('listItem').run()} disabled={!editor.can().liftListItem('listItem')}>
        <Outdent className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Indent" onClick={() => editor.chain().focus().sinkListItem('listItem').run()} disabled={!editor.can().sinkListItem('listItem')}>
        <Indent className="h-3.5 w-3.5" />
      </ToolbarButton>

      {/* Lists */}
      <ToolbarButton title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>
        <List className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive('orderedList')}>
        <ListOrdered className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Line height */}
      <ToolbarSelect
        title="Line height"
        value={currentLineHeight}
        onChange={(v) => v ? editor.chain().focus().setLineHeight(v).run() : editor.chain().focus().unsetLineHeight().run()}
        className="w-16"
      >
        {LINE_HEIGHTS.map((l) => (
          <option key={l.label} value={l.value}>{l.label}</option>
        ))}
      </ToolbarSelect>

      <Divider />

      {/* Link */}
      <ToolbarButton title="Insert / edit link" onClick={handleLink} active={editor.isActive('link')}>
        <Link className="h-3.5 w-3.5" />
      </ToolbarButton>

      {/* Image upload */}
      <ToolbarButton title="Insert image" onClick={() => imageInputRef.current?.click()}>
        <Image className="h-3.5 w-3.5" />
      </ToolbarButton>
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleImageUpload}
      />

      {/* Table */}
      <ToolbarButton title="Insert table (3×3)" onClick={handleInsertTable} active={editor.isActive('table')}>
        <Table className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Divider />

      {/* Math / Chemistry visual editor buttons */}
      <button
        type="button"
        title="Insert math formula"
        onMouseDown={(e) => { e.preventDefault(); setMathModal({ open: true, mode: 'math' }) }}
        className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors font-mono"
      >
        ∑ Math
      </button>
      <button
        type="button"
        title="Insert chemistry formula"
        onMouseDown={(e) => { e.preventDefault(); setMathModal({ open: true, mode: 'chemistry' }) }}
        className="inline-flex h-7 items-center gap-1 rounded px-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors"
      >
        ⚗ Chem
      </button>

      <MathInsertModal
        open={mathModal.open}
        defaultMode={mathModal.mode}
        onClose={() => setMathModal((s) => ({ ...s, open: false }))}
        onInsert={handleMathInsert}
      />
    </div>
  )
}
