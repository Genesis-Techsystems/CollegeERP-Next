'use client'

import { useCallback, useRef, useState, type DragEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type FileDropzoneProps = {
  accept?: string
  multiple?: boolean
  className?: string
  children?: ReactNode
  onFilesChange: (files: File[]) => void
}

export function FileDropzone({
  accept,
  multiple = false,
  className,
  children,
  onFilesChange,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  const emitFiles = useCallback(
    (list: FileList | null) => {
      if (!list?.length) {
        onFilesChange([])
        return
      }
      const files = Array.from(list)
      onFilesChange(multiple ? files : files.slice(-1))
    },
    [multiple, onFilesChange],
  )

  function onDragOver(e: DragEvent) {
    e.preventDefault()
    setDragging(true)
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    emitFiles(e.dataTransfer.files)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          inputRef.current?.click()
        }
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        'max-w-[760px] cursor-pointer rounded-md border border-dashed border-slate-300 bg-muted/40/50 p-3 min-h-[44px] transition-colors',
        dragging && 'border-[hsl(var(--primary))] bg-slate-100',
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(e) => {
          emitFiles(e.target.files)
          e.target.value = ''
        }}
        onClick={(e) => e.stopPropagation()}
      />
      {children}
    </div>
  )
}
