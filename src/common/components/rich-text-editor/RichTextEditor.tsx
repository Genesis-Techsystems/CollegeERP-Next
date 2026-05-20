'use client'

/**
 * RichTextEditor — Tiptap with full formatting toolbar.
 *
 * Matches Angular TinyMCE feature set:
 *   undo/redo · font family · font size · bold · italic · underline ·
 *   text/bg colour · align · indent · lists · line-height ·
 *   link · image (base64 upload) · table · KaTeX math · mhchem chemistry
 */

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Mathematics from '@tiptap/extension-mathematics'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import { Table } from '@tiptap/extension-table'
import TableRow from '@tiptap/extension-table-row'
import TableHeader from '@tiptap/extension-table-header'
import TableCell from '@tiptap/extension-table-cell'
import 'katex/contrib/mhchem'

import { cn } from '@/lib/utils'
import { RichTextToolbar } from './RichTextToolbar'

// ─── Custom FontSize extension (extends TextStyle) ────────────────────────────

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    fontSize: {
      setFontSize: (size: string) => ReturnType
      unsetFontSize: () => ReturnType
    }
    lineHeight: {
      setLineHeight: (height: string) => ReturnType
      unsetLineHeight: () => ReturnType
    }
  }
}

const FontSize = Extension.create({
  name: 'fontSize',
  addGlobalAttributes() {
    return [{
      types: ['textStyle'],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize || null,
          renderHTML: (attrs) => attrs.fontSize ? { style: `font-size: ${attrs.fontSize}` } : {},
        },
      },
    }]
  },
  addCommands() {
    return {
      setFontSize: (size) => ({ chain }) => chain().setMark('textStyle', { fontSize: size }).run(),
      unsetFontSize: () => ({ chain }) => chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    }
  },
})

const LineHeight = Extension.create({
  name: 'lineHeight',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el) => el.style.lineHeight || null,
          renderHTML: (attrs) => attrs.lineHeight ? { style: `line-height: ${attrs.lineHeight}` } : {},
        },
      },
    }]
  },
  addCommands() {
    return {
      setLineHeight: (height) => ({ commands }) => commands.updateAttributes('paragraph', { lineHeight: height }),
      unsetLineHeight: () => ({ commands }) => commands.resetAttributes('paragraph', 'lineHeight'),
    }
  },
})

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RichTextEditorProps {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  minHeight?: number
  compact?: boolean
  disabled?: boolean
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Type here… Use $…$ for math, \\ce{…} for chemistry',
  minHeight = 200,
  compact = false,
  disabled = false,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Mathematics,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      LineHeight,
      Link.configure({ openOnClick: false }),
      Image.configure({ inline: false, allowBase64: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none px-3 py-2',
        style: `min-height: ${minHeight}px`,
        'data-placeholder': placeholder,
      },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if (current !== value) {
      editor.commands.setContent(value)
    }
  }, [value, editor])

  return (
    <div
      className={cn(
        'rounded-md border border-input bg-background text-sm',
        disabled && 'opacity-60 cursor-not-allowed',
        '[&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-gray-300 [&_.ProseMirror_td]:p-1 [&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-gray-300 [&_.ProseMirror_th]:p-1 [&_.ProseMirror_th]:bg-gray-50',
        className,
      )}
    >
      {!compact && <RichTextToolbar editor={editor} />}
      <EditorContent editor={editor} />
    </div>
  )
}
