'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, FileText, Play, Trash2, Upload } from 'lucide-react'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { useSessionContext } from '@/context/SessionContext'
import { toastError, toastInfo, toastSuccess } from '@/lib/toast'
import {
  deleteCourseLessonTopicVideo,
  getPresignedUri,
  listCourseLessonsByOnlineCourse,
  updateCourseLessonTopic,
  uploadUnitTopic,
  type CourseLessonTopic,
  type CourseLessonUnit,
} from '@/services'
import { cn } from '@/lib/utils'
import {
  PlayVideoModal,
  type PlayVideoModalData,
} from './PlayVideoModal'

const TOPIC_BG = [
  'linear-gradient(135deg, #23bdb8 0%, #43e794 100%)',
  'linear-gradient(135deg, rgb(244 180 101) 0%, rgb(253 63 63 / 82%) 100%)',
  'linear-gradient(45deg, #a52dd8, #e29bf1)',
  'linear-gradient(135deg, #9a56ff 0%, #e36cd9 100%)',
  'linear-gradient(135deg, rgb(40 113 245), rgb(167 236 132))',
  'linear-gradient(to right, #a77ffc 0%, #ff6eac 100%)',
]

function text(val: unknown): string {
  if (typeof val === 'string') return val
  if (typeof val === 'number') return String(val)
  return ''
}

function num(val: unknown): number {
  const n = Number(val)
  return Number.isFinite(n) ? n : 0
}

/** Angular `bytesToSize` — returns magnitude only; compare `<= 400` for upload limit. */
function bytesToSize(bytes: number): number {
  if (bytes === 0) return 0
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return Math.round(bytes / Math.pow(1024, i))
}

function decorateUnits(rows: CourseLessonUnit[]): CourseLessonUnit[] {
  let x = 1
  return rows.map((unit) => {
    const topics = Array.isArray(unit.courseLessonTopicDTOs)
      ? unit.courseLessonTopicDTOs.map((topic) => {
          const imgIndex = x <= 12 ? x : ((x = 1), 1)
          x = imgIndex + 1
          return {
            ...topic,
            img: TOPIC_BG[(imgIndex - 1) % TOPIC_BG.length],
            lessonName: unit.unitName,
          }
        })
      : []
    return {
      ...unit,
      unitName: unit.unitName || text(unit.lessonCode) || 'Unit',
      courseLessonTopicDTOs: topics,
    }
  })
}

export function UploadSubjectContentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useSessionContext()

  const pageParams = useMemo(() => {
    const p = Object.fromEntries(searchParams.entries())
    return {
      collegeId: p.collegeId ?? '',
      academicYearId: p.academicYearId ?? '',
      courseYearId: p.courseYearId ?? '',
      courseGroupId: p.courseGroupId ?? '',
      onlineCourseId: p.onlineCourseId ?? '',
      courseId: p.courseId ?? '',
      studentAcademicbatchId: p.studentAcademicbatchId ?? '',
      collegeName: p.collegeName ?? '',
      courseYearName: p.courseYearName ?? '',
      // Angular maps courseGroupName from `groupName` (often missing); also accept courseGroupName
      courseGroupName: p.courseGroupName ?? p.groupName ?? '',
      academicYear: p.academicYear ?? '',
      subjectName: p.subjectName ?? '',
      subjectCode: p.subjectCode ?? '',
      subjectId: p.subjectId ?? '',
      courseCode: p.courseCode ?? '',
      regulationCode: p.regulationCode ?? '',
      subjectRegulationId: p.subjectRegulationId ?? '',
      page: p.page || '/digital-library/manage-course-content',
      pageno: num(p.pageno) || 2,
    }
  }, [searchParams])

  const canUpload = pageParams.pageno !== 1
  const emp = num(user?.userId)

  const [units, setUnits] = useState<CourseLessonUnit[]>([])
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [playOpen, setPlayOpen] = useState(false)
  const [playData, setPlayData] = useState<PlayVideoModalData | null>(null)
  const videoInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  const getUnits = useCallback(async () => {
    if (!pageParams.onlineCourseId) return
    setLoading(true)
    try {
      const rows = await listCourseLessonsByOnlineCourse(pageParams.onlineCourseId)
      setUnits(decorateUnits(rows))
    } catch (error) {
      toastError(error, 'Failed to load units')
      setUnits([])
    } finally {
      setLoading(false)
    }
  }, [pageParams.onlineCourseId])

  useEffect(() => {
    void getUnits()
  }, [getUnits])

  async function playVideo(topic: CourseLessonTopic, topics: CourseLessonTopic[]) {
    if (!topic.videoUrl) return
    setBusy(true)
    try {
      const uri = await getPresignedUri(String(topic.videoUrl))
      setPlayData({
        subjectName: pageParams.subjectName,
        uri,
        topic,
        topics,
      })
      setPlayOpen(true)
    } catch (error) {
      toastError(error, 'Failed to play video')
    } finally {
      setBusy(false)
    }
  }

  async function onSelectPlaylistTopic(topic: CourseLessonTopic) {
    if (!playData || !topic.videoUrl) return
    setBusy(true)
    try {
      const uri = await getPresignedUri(String(topic.videoUrl))
      setPlayData({ ...playData, uri, topic })
    } catch (error) {
      toastError(error, 'Failed to play video')
    } finally {
      setBusy(false)
    }
  }

  async function deleteVideo(topic: CourseLessonTopic) {
    if (!topic.videoUrl || !topic.courseLessonTopicId) return
    const path = String(topic.videoUrl).split('.com/')[1]
    if (!path) {
      toastInfo('Invalid video path.')
      return
    }
    setBusy(true)
    try {
      const message = await deleteCourseLessonTopicVideo({
        videoPath: path,
        courseLessonTopicId: Number(topic.courseLessonTopicId),
      })
      toastSuccess(message)
      await getUnits()
    } catch (error) {
      toastError(error, 'Failed to delete video')
    } finally {
      setBusy(false)
    }
  }

  async function videoUpload(
    file: File,
    unit: CourseLessonUnit,
    topic: CourseLessonTopic,
  ) {
    if (bytesToSize(file.size) > 400) {
      toastInfo('Uploaded file is exceeded than 200MB.')
      return
    }
    setBusy(true)
    try {
      const formData = new FormData()
      formData.append('file', file, file.name)
      formData.append('subject', pageParams.subjectCode)
      formData.append('unit', text(unit.lessonCode))
      formData.append('topic', text(topic.topicName))
      const uploaded = await uploadUnitTopic(formData)
      const updated: CourseLessonTopic = { ...topic, videoUrl: uploaded.uri }
      await updateCourseLessonTopic(updated)
      toastSuccess(uploaded.message)
      await getUnits()
    } catch (error) {
      toastError(error, 'Video upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function fileUpload(
    file: File,
    unit: CourseLessonUnit,
    topic: CourseLessonTopic,
  ) {
    setBusy(true)
    try {
      const formData = new FormData()
      formData.append('file', file, file.name)
      formData.append('subject', pageParams.subjectCode)
      formData.append('unit', text(unit.lessonCode))
      formData.append('topic', text(topic.topicName))
      const uploaded = await uploadUnitTopic(formData)
      const updated: CourseLessonTopic = { ...topic, refDocUrl: uploaded.uri }
      await updateCourseLessonTopic(updated)
      toastSuccess(uploaded.message)
      await getUnits()
    } catch (error) {
      toastError(error, 'Document upload failed')
    } finally {
      setBusy(false)
    }
  }

  async function viewFile(topic: CourseLessonTopic) {
    if (!topic.refDocUrl) return
    setBusy(true)
    try {
      const uri = await getPresignedUri(String(topic.refDocUrl))
      window.open(uri, '_blank', 'noopener,noreferrer')
    } catch (error) {
      toastError(error, 'Failed to open file')
    } finally {
      setBusy(false)
    }
  }

  function goBack() {
    const qs = new URLSearchParams({
      collegeId: String(num(pageParams.collegeId) || ''),
      courseId: String(num(pageParams.courseId) || ''),
      subjectId: String(num(pageParams.subjectId) || ''),
      subjectRegulationId: String(num(pageParams.subjectRegulationId) || ''),
      studentAcademicbatchId: String(num(pageParams.studentAcademicbatchId) || ''),
      courseGroupId: String(num(pageParams.courseGroupId) || ''),
      courseYearId: String(num(pageParams.courseYearId) || ''),
      academicYearId: String(num(pageParams.academicYearId) || ''),
    })
    const base = pageParams.page.startsWith('/')
      ? pageParams.page
      : `/${pageParams.page}`
    router.push(`${base}?${qs.toString()}`)
  }

  const meta = [
    pageParams.collegeName,
    pageParams.academicYear,
    pageParams.courseCode,
    pageParams.courseGroupName,
    pageParams.courseYearName,
    pageParams.regulationCode,
  ]
    .filter(Boolean)
    .join(' / ')

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b border-border px-5 py-4">
          <h1 className="text-lg font-semibold text-foreground">
            {pageParams.subjectName || 'Subject Content'}{' '}
            {meta ? (
              <span className="font-semibold text-foreground/80">({meta})</span>
            ) : null}
          </h1>
          <p className="mt-1 text-[15px] font-semibold text-[#4a4a4a]">
            {units.length} Chapters
          </p>
        </div>

        <Tabs
          defaultValue="videos"
          onValueChange={(v) => {
            if (v === 'videos') void getUnits()
          }}
        >
          <TabsList className="h-auto w-full justify-start rounded-none border-b border-border bg-transparent p-0">
            <TabsTrigger
              value="videos"
              className="rounded-none border-b-2 border-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              UPLOAD VIDEOS
            </TabsTrigger>
            <TabsTrigger
              value="concepts"
              className="rounded-none border-b-2 border-transparent px-4 py-3 text-muted-foreground shadow-none data-[state=active]:border-blue-600 data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:shadow-none"
            >
              UPLOAD CONCEPTS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-0 p-4">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading units…</p>
            ) : units.length === 0 ? (
              <p className="text-sm text-muted-foreground">No units found.</p>
            ) : (
              <div className="space-y-6">
                {units.map((unit, i) => (
                  <div key={String(unit.courseLessonId ?? i)}>
                    <p className="mb-3 text-base font-semibold text-[#0c51a4]">
                      <span className="mr-2 text-xl text-black">
                        {i > 9 ? i + 1 : `0${i + 1}`}
                      </span>
                      {unit.unitName}
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {(unit.courseLessonTopicDTOs ?? []).map((topic, j) => {
                        const inputId = `video-${topic.subjectUnitTopicId ?? topic.courseLessonTopicId ?? j}`
                        const hasVideo = Boolean(topic.videoUrl)
                        const canDelete =
                          hasVideo && num(topic.createdUser) === emp
                        return (
                          <div
                            key={String(topic.courseLessonTopicId ?? j)}
                            className="relative h-[130px] w-[200px] shrink-0 overflow-hidden rounded-lg"
                            style={{ background: topic.img ?? TOPIC_BG[0] }}
                          >
                            <div className="flex h-full flex-col items-center justify-center px-2 text-center text-white">
                              <BookOpen className="mb-1 h-6 w-6 opacity-80" />
                              {hasVideo ? (
                                <button
                                  type="button"
                                  className="absolute inset-0 flex items-center justify-center bg-black/20"
                                  onClick={() =>
                                    void playVideo(
                                      topic,
                                      unit.courseLessonTopicDTOs ?? [],
                                    )
                                  }
                                  disabled={busy}
                                  aria-label="Play video"
                                >
                                  <Play className="h-10 w-10 fill-white text-white" />
                                </button>
                              ) : null}
                              {canDelete ? (
                                <button
                                  type="button"
                                  className="absolute left-1 top-1 rounded-full bg-white p-1 text-foreground shadow"
                                  onClick={() => void deleteVideo(topic)}
                                  disabled={busy}
                                  aria-label="Delete video"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              ) : null}
                              {!hasVideo && canUpload ? (
                                <>
                                  <button
                                    type="button"
                                    className="absolute inset-0 flex items-center justify-center bg-black/10"
                                    onClick={() =>
                                      videoInputRefs.current[inputId]?.click()
                                    }
                                    disabled={busy}
                                    aria-label="Upload video"
                                  >
                                    <Upload className="h-8 w-8" />
                                  </button>
                                  <input
                                    ref={(el) => {
                                      videoInputRefs.current[inputId] = el
                                    }}
                                    id={inputId}
                                    type="file"
                                    accept="video/mp4,video/x-m4v,video/*"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      e.target.value = ''
                                      if (file) void videoUpload(file, unit, topic)
                                    }}
                                  />
                                </>
                              ) : null}
                              <span className="relative z-10 mt-auto pb-2 text-[13px] font-semibold">
                                {text(topic.topicName)}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="concepts" className="mt-0 p-4">
            {units.length === 0 ? (
              <p className="text-sm text-muted-foreground">No units found.</p>
            ) : (
              <div className="space-y-2">
                {units.map((unit, i) => (
                  <Collapsible key={String(unit.courseLessonId ?? i)} defaultOpen={i === 0}>
                    <CollapsibleTrigger
                      className={cn(
                        'flex w-full items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2 text-left text-sm font-medium',
                      )}
                    >
                      <span>
                        {i > 9 ? `Lesson ${i + 1}` : `Lesson 0${i + 1}`} - {unit.unitName}
                      </span>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border border-t-0 border-border px-3 py-2">
                      {(unit.courseLessonTopicDTOs ?? []).map((topic, j) => {
                        const docId = `doc-${topic.courseLessonTopicId ?? j}`
                        return (
                          <div
                            key={String(topic.courseLessonTopicId ?? j)}
                            className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0"
                          >
                            <span className="text-sm">
                              <small className="mr-1 text-muted-foreground">
                                {i + 1}.{j + 1}
                              </small>
                              {text(topic.topicName)}
                            </span>
                            <div className="flex items-center gap-2">
                              {topic.refDocUrl ? (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 text-sm text-blue-600"
                                  onClick={() => void viewFile(topic)}
                                  disabled={busy}
                                >
                                  <FileText className="h-4 w-4" />
                                  View
                                </button>
                              ) : canUpload ? (
                                <>
                                  <button
                                    type="button"
                                    className="inline-flex items-center gap-1 text-sm"
                                    onClick={() =>
                                      docInputRefs.current[docId]?.click()
                                    }
                                    disabled={busy}
                                  >
                                    <Upload className="h-4 w-4" />
                                    Upload
                                  </button>
                                  <input
                                    ref={(el) => {
                                      docInputRefs.current[docId] = el
                                    }}
                                    id={docId}
                                    type="file"
                                    accept=".png,.jpg,.jpeg,.pdf,.doc"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      e.target.value = ''
                                      if (file) void fileUpload(file, unit, topic)
                                    }}
                                  />
                                </>
                              ) : null}
                            </div>
                          </div>
                        )
                      })}
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <div className="flex justify-end">
        <Button type="button" variant="outline" onClick={goBack}>
          Back
        </Button>
      </div>

      <PlayVideoModal
        open={playOpen}
        data={playData}
        onClose={() => {
          setPlayOpen(false)
          setPlayData(null)
        }}
        onSelectTopic={(topic) => void onSelectPlaylistTopic(topic)}
      />
    </PageContainer>
  )
}
