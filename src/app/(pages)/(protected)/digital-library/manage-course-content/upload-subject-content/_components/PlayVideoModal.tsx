'use client'

import { X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { CourseLessonTopic } from '@/services'
import { cn } from '@/lib/utils'

export type PlayVideoModalData = {
  subjectName: string
  uri: string
  topic: CourseLessonTopic
  topics: CourseLessonTopic[]
}

type PlayVideoModalProps = {
  open: boolean
  data: PlayVideoModalData | null
  onClose: () => void
  onSelectTopic: (topic: CourseLessonTopic) => void
}

export function PlayVideoModal({
  open,
  data,
  onClose,
  onSelectTopic,
}: PlayVideoModalProps) {
  if (!data) return null

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-hidden bg-slate-900 p-0 text-white sm:max-w-[1000px]">
        <DialogHeader className="flex flex-row items-center justify-between border-b border-white/10 px-4 py-3">
          <DialogTitle className="text-base font-semibold text-white">
            {data.subjectName}{' '}
            <span className="text-blue-400">
              ({text(data.topic.lessonName) || text(data.topic.topicName)})
            </span>
          </DialogTitle>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-white/80 hover:bg-white/10"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </DialogHeader>
        <div className="grid max-h-[70vh] grid-cols-1 gap-4 overflow-y-auto p-4 md:grid-cols-4">
          <div className="md:col-span-3">
            {data.uri ? (
              <video
                key={data.uri}
                className="w-full rounded-lg"
                controls
                autoPlay
                preload="auto"
              >
                <source src={data.uri} type="video/mp4" />
              </video>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg bg-black/40 text-sm text-white/70">
                Loading video…
              </div>
            )}
            <p className="mt-3 text-base font-semibold">{text(data.topic.topicName)}</p>
          </div>
          <div className="flex flex-col gap-2">
            {data.topics.map((topic, idx) => {
              const active =
                Number(topic.courseLessonTopicId) ===
                Number(data.topic.courseLessonTopicId)
              return (
                <button
                  key={String(topic.courseLessonTopicId ?? idx)}
                  type="button"
                  disabled={!topic.videoUrl}
                  onClick={() => topic.videoUrl && onSelectTopic(topic)}
                  className={cn(
                    'rounded-md border px-2 py-2 text-left text-xs transition',
                    active
                      ? 'border-blue-400 bg-blue-500/20'
                      : 'border-white/10 bg-white/5 hover:bg-white/10',
                    !topic.videoUrl && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {text(topic.topicName) || `Topic ${idx + 1}`}
                </button>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function text(val: unknown): string {
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return ''
}
