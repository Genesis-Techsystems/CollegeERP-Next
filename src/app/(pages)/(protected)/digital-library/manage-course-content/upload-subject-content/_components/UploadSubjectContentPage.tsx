"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { BookOpen, ChevronDown, PlusSquare, Trash2 } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  deleteCourseLessonTopicVideo,
  getPresignedUri,
  listCourseLessonsByOnlineCourse,
  updateCourseLessonTopic,
  uploadUnitTopic,
  type CourseLessonTopic,
  type CourseLessonUnit,
} from "@/services";
import { cn } from "@/lib/utils";
import { PlayVideoModal, type PlayVideoModalData } from "./PlayVideoModal";

const UPLOAD_ICON = "/images/upload.png";
const PLAY_ICON = "/images/play.png";
const FILE_ICON = "/images/file.png";

const UPLOAD_TAB_TRIGGER_CLASS =
  "rounded-none border-0 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground shadow-none data-[state=active]:!bg-[#0c51a4] data-[state=active]:!text-white data-[state=active]:shadow-none";

function text(val: unknown): string {
  if (typeof val === "string") return val;
  if (typeof val === "number") return String(val);
  return "";
}

function num(val: unknown): number {
  const n = Number(val);
  return Number.isFinite(n) ? n : 0;
}

/** Angular `bytesToSize` — returns magnitude only; compare `<= 400` for upload limit. */
function bytesToSize(bytes: number): number {
  if (bytes === 0) return 0;
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i));
}

function decorateUnits(rows: CourseLessonUnit[]): CourseLessonUnit[] {
  let x = 1;
  return rows.map((unit) => {
    const topics = Array.isArray(unit.courseLessonTopicDTOs)
      ? unit.courseLessonTopicDTOs.map((topic) => {
          let imgIndex: number;
          if (x <= 12) {
            imgIndex = x;
            x += 1;
          } else {
            x = 1;
            imgIndex = 1;
          }
          return {
            ...topic,
            img: `/images/subjects/${imgIndex}.png`,
            lessonName: unit.unitName,
          };
        })
      : [];
    return {
      ...unit,
      unitName: unit.unitName || text(unit.lessonCode) || "Unit",
      courseLessonTopicDTOs: topics,
    };
  });
}

/** Angular `ngx-slick-carousel` — 90% width, 4 slides visible, `nav-icon.png` arrows. */
function TopicCarousel({ children }: { children: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null);

  function scroll(dir: "left" | "right") {
    const el = trackRef.current;
    if (!el) return;
    const slideWidth = el.clientWidth / 4;
    el.scrollBy({
      left: dir === "left" ? -slideWidth : slideWidth,
      behavior: "smooth",
    });
  }

  return (
    <div className="relative mx-auto w-[90%] py-3">
      <button
        type="button"
        onClick={() => scroll("left")}
        className="absolute -left-8 top-[50px] h-[47px] w-[26px] cursor-pointer bg-[url('/images/nav-icon.png')] bg-no-repeat [background-position:0_0] hover:[background-position:0_-53px]"
        aria-label="Previous topics"
      />
      <div
        ref={trackRef}
        className="flex overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {children}
      </div>
      <button
        type="button"
        onClick={() => scroll("right")}
        className="absolute -right-8 top-[50px] h-[47px] w-[26px] cursor-pointer bg-[url('/images/nav-icon.png')] bg-no-repeat [background-position:-24px_0] hover:[background-position:-24px_-53px]"
        aria-label="Next topics"
      />
    </div>
  );
}

/** Angular `fuse-widget` slide — 25% width with horizontal gutter. */
function TopicSlide({ children }: { children: ReactNode }) {
  return <div className="box-border w-1/4 shrink-0 px-2.5">{children}</div>;
}

export function UploadSubjectContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();

  const pageParams = useMemo(() => {
    const p = Object.fromEntries(searchParams.entries());
    return {
      collegeId: p.collegeId ?? "",
      academicYearId: p.academicYearId ?? "",
      courseYearId: p.courseYearId ?? "",
      courseGroupId: p.courseGroupId ?? "",
      onlineCourseId: p.onlineCourseId ?? "",
      courseId: p.courseId ?? "",
      studentAcademicbatchId: p.studentAcademicbatchId ?? "",
      collegeName: p.collegeName ?? "",
      courseYearName: p.courseYearName ?? "",
      // Angular maps courseGroupName from `groupName` (often missing); also accept courseGroupName
      courseGroupName: p.courseGroupName ?? p.groupName ?? "",
      academicYear: p.academicYear ?? "",
      subjectName: p.subjectName ?? "",
      subjectCode: p.subjectCode ?? "",
      subjectId: p.subjectId ?? "",
      courseCode: p.courseCode ?? "",
      regulationCode: p.regulationCode ?? "",
      subjectRegulationId: p.subjectRegulationId ?? "",
      page: p.page || "/digital-library/manage-course-content",
      pageno: num(p.pageno) || 2,
    };
  }, [searchParams]);

  const canUpload = pageParams.pageno !== 1;
  const emp = num(user?.userId);

  const [openLessonIndex, setOpenLessonIndex] = useState(0);
  const [units, setUnits] = useState<CourseLessonUnit[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [playOpen, setPlayOpen] = useState(false);
  const [playData, setPlayData] = useState<PlayVideoModalData | null>(null);
  const videoInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const docInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getUnits = useCallback(async () => {
    if (!pageParams.onlineCourseId) return;
    setLoading(true);
    try {
      const rows = await listCourseLessonsByOnlineCourse(
        pageParams.onlineCourseId,
      );
      setUnits(decorateUnits(rows));
    } catch (error) {
      toastError(error, "Failed to load units");
      setUnits([]);
    } finally {
      setLoading(false);
    }
  }, [pageParams.onlineCourseId]);

  useEffect(() => {
    void getUnits();
  }, [getUnits]);

  async function playVideo(
    topic: CourseLessonTopic,
    topics: CourseLessonTopic[],
  ) {
    if (!topic.videoUrl) return;
    setBusy(true);
    try {
      const uri = await getPresignedUri(String(topic.videoUrl));
      setPlayData({
        subjectName: pageParams.subjectName,
        uri,
        topic,
        topics,
      });
      setPlayOpen(true);
    } catch (error) {
      toastError(error, "Failed to play video");
    } finally {
      setBusy(false);
    }
  }

  async function onSelectPlaylistTopic(topic: CourseLessonTopic) {
    if (!playData || !topic.videoUrl) return;
    setBusy(true);
    try {
      const uri = await getPresignedUri(String(topic.videoUrl));
      setPlayData({ ...playData, uri, topic });
    } catch (error) {
      toastError(error, "Failed to play video");
    } finally {
      setBusy(false);
    }
  }

  async function deleteVideo(topic: CourseLessonTopic) {
    if (!topic.videoUrl || !topic.courseLessonTopicId) return;
    const path = String(topic.videoUrl).split(".com/")[1];
    if (!path) {
      toastInfo("Invalid video path.");
      return;
    }
    setBusy(true);
    try {
      const message = await deleteCourseLessonTopicVideo({
        videoPath: path,
        courseLessonTopicId: Number(topic.courseLessonTopicId),
      });
      toastSuccess(message);
      await getUnits();
    } catch (error) {
      toastError(error, "Failed to delete video");
    } finally {
      setBusy(false);
    }
  }

  async function videoUpload(
    file: File,
    unit: CourseLessonUnit,
    topic: CourseLessonTopic,
  ) {
    if (bytesToSize(file.size) > 400) {
      toastInfo("Uploaded file is exceeded than 200MB.");
      return;
    }
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("subject", pageParams.subjectCode);
      formData.append("unit", text(unit.lessonCode));
      formData.append("topic", text(topic.topicName));
      const uploaded = await uploadUnitTopic(formData);
      const updated: CourseLessonTopic = { ...topic, videoUrl: uploaded.uri };
      await updateCourseLessonTopic(updated);
      toastSuccess(uploaded.message);
      await getUnits();
    } catch (error) {
      toastError(error, "Video upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function fileUpload(
    file: File,
    unit: CourseLessonUnit,
    topic: CourseLessonTopic,
  ) {
    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("subject", pageParams.subjectCode);
      formData.append("unit", text(unit.lessonCode));
      formData.append("topic", text(topic.topicName));
      const uploaded = await uploadUnitTopic(formData);
      const updated: CourseLessonTopic = { ...topic, refDocUrl: uploaded.uri };
      await updateCourseLessonTopic(updated);
      toastSuccess(uploaded.message);
      await getUnits();
    } catch (error) {
      toastError(error, "Document upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function viewFile(topic: CourseLessonTopic) {
    if (!topic.refDocUrl) return;
    setBusy(true);
    try {
      const uri = await getPresignedUri(String(topic.refDocUrl));
      window.open(uri, "_blank", "noopener,noreferrer");
    } catch (error) {
      toastError(error, "Failed to open file");
    } finally {
      setBusy(false);
    }
  }

  function goBack() {
    const qs = new URLSearchParams({
      collegeId: String(num(pageParams.collegeId) || ""),
      courseId: String(num(pageParams.courseId) || ""),
      subjectId: String(num(pageParams.subjectId) || ""),
      subjectRegulationId: String(num(pageParams.subjectRegulationId) || ""),
      studentAcademicbatchId: String(
        num(pageParams.studentAcademicbatchId) || "",
      ),
      courseGroupId: String(num(pageParams.courseGroupId) || ""),
      courseYearId: String(num(pageParams.courseYearId) || ""),
      academicYearId: String(num(pageParams.academicYearId) || ""),
    });
    const base = pageParams.page.startsWith("/")
      ? pageParams.page
      : `/${pageParams.page}`;
    router.push(`${base}?${qs.toString()}`);
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
    .join(" / ");

  return (
    <PageContainer className="space-y-4">
      <div className="app-card overflow-hidden">
        <div className="border-b border-border px-6 py-4">
          <div className="flex items-start gap-2">
            <PlusSquare
              className="mt-0.5 h-5 w-5 shrink-0 text-[#0c51a4]"
              aria-hidden
            />
            <div>
              <h1 className="text-base font-bold leading-snug text-[#0c51a4]">
                {pageParams.subjectName || "Subject Content"}{" "}
                {meta ? (
                  <span className="font-semibold text-black">({meta})</span>
                ) : null}
              </h1>
              <p className="mt-1.5 text-[15px] font-semibold text-[#4a4a4a]">
                {units.length} Chapters
              </p>
            </div>
          </div>
        </div>

        <Tabs
          defaultValue="videos"
          onValueChange={(v) => {
            if (v === "videos") void getUnits();
          }}
        >
          <TabsList className="h-auto w-full justify-start gap-0 rounded-none border-b border-border bg-white p-0">
            <TabsTrigger value="videos" className={UPLOAD_TAB_TRIGGER_CLASS}>
              UPLOAD VIDEOS
            </TabsTrigger>
            <TabsTrigger value="concepts" className={UPLOAD_TAB_TRIGGER_CLASS}>
              UPLOAD CONCEPTS
            </TabsTrigger>
          </TabsList>

          <TabsContent value="videos" className="mt-0 px-4 py-3">
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading units…</p>
            ) : units.length === 0 ? (
              <p className="text-sm text-muted-foreground">No units found.</p>
            ) : (
              <div className="space-y-4">
                {units.map((unit, i) => (
                  <div key={String(unit.courseLessonId ?? i)}>
                    <p className="mb-2 ml-1 text-base font-semibold text-[#0c51a4]">
                      <span className="mr-1.5 text-xl text-black">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      {unit.unitName}
                    </p>
                    <TopicCarousel>
                      {(unit.courseLessonTopicDTOs ?? []).map((topic, j) => {
                        const inputId = `video-${topic.subjectUnitTopicId ?? topic.courseLessonTopicId ?? j}`;
                        const hasVideo = Boolean(topic.videoUrl);
                        const canDelete =
                          hasVideo && num(topic.createdUser) === emp;
                        return (
                          <TopicSlide
                            key={String(topic.courseLessonTopicId ?? j)}
                          >
                            <div
                              className="relative h-[130px] w-full overflow-hidden rounded-[20px] shadow-md"
                              style={{
                                backgroundImage: `url(${topic.img})`,
                                backgroundSize: "cover",
                                backgroundPosition: "center",
                              }}
                            >
                              <div className="relative flex h-full flex-col items-center px-1.5 text-center text-white">
                                <div className="flex h-[60px] w-full shrink-0 items-center justify-center text-[30px] text-[#4e93e6]">
                                  <BookOpen className="h-7 w-7" aria-hidden />
                                </div>
                                {hasVideo ? (
                                  <button
                                    type="button"
                                    className="absolute right-[5px] top-[5px] z-[2] cursor-pointer border-0 bg-transparent p-0"
                                    onClick={() =>
                                      void playVideo(
                                        topic,
                                        unit.courseLessonTopicDTOs ?? [],
                                      )
                                    }
                                    disabled={busy}
                                    aria-label="Play video"
                                  >
                                    <img
                                      src={PLAY_ICON}
                                      alt=""
                                      className="h-[22px] w-[25px] object-contain"
                                    />
                                  </button>
                                ) : null}
                                {canDelete ? (
                                  <button
                                    type="button"
                                    className="absolute left-[5px] top-[5px] z-[2] cursor-pointer rounded-full border-0 bg-white p-1.5 text-foreground shadow"
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
                                      className="absolute right-[5px] top-[5px] z-[2] cursor-pointer border-0 bg-transparent p-0"
                                      onClick={() =>
                                        videoInputRefs.current[inputId]?.click()
                                      }
                                      disabled={busy}
                                      aria-label="Upload video"
                                    >
                                      <img
                                        src={UPLOAD_ICON}
                                        alt=""
                                        className="h-[22px] w-[25px] object-contain"
                                      />
                                    </button>
                                    <input
                                      ref={(el) => {
                                        videoInputRefs.current[inputId] = el;
                                      }}
                                      id={inputId}
                                      type="file"
                                      accept="video/mp4,video/x-m4v,video/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = "";
                                        if (file)
                                          void videoUpload(file, unit, topic);
                                      }}
                                    />
                                  </>
                                ) : null}
                                <p className="flex flex-1 items-center justify-center px-1.5 py-[3px] text-[13px] font-semibold leading-[1.35] text-white">
                                  {text(topic.topicName)}
                                </p>
                              </div>
                            </div>
                          </TopicSlide>
                        );
                      })}
                    </TopicCarousel>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="concepts" className="mt-0 px-6 py-2">
            {units.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                No units found.
              </p>
            ) : (
              <div className="w-full overflow-hidden rounded-md border border-border">
                {units.map((unit, i) => (
                  <Collapsible
                    key={String(unit.courseLessonId ?? i)}
                    open={openLessonIndex === i}
                    onOpenChange={(open) => {
                      setOpenLessonIndex(open ? i : -1);
                    }}
                    className="border-b border-border last:border-b-0"
                  >
                    <CollapsibleTrigger
                      className={cn(
                        "group flex w-full items-center justify-between border-border bg-white px-4 py-3 text-left text-base font-semibold text-foreground hover:bg-muted/10",
                      )}
                    >
                      <span className="form-header">
                        Lesson {String(i + 1).padStart(2, "0")}- {unit.unitName}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                    </CollapsibleTrigger>
                    <CollapsibleContent className="border-t border-border bg-white px-4 pb-3 pt-1">
                      {(unit.courseLessonTopicDTOs ?? []).map((topic, j) => {
                        const docId = `doc-${topic.courseLessonTopicId ?? j}`;
                        return (
                          <div
                            key={String(topic.courseLessonTopicId ?? j)}
                            className="flex items-center justify-between gap-4 py-2"
                          >
                            <span className="flex min-w-0 flex-[3] items-start gap-2 text-sm">
                              <small className="topic-no mt-0.5 inline-flex shrink-0 items-center justify-center rounded-full bg-[rgba(33,150,243,0.98)] p-1 text-[11px] font-medium leading-none text-white">
                                {i + 1}.{j + 1}
                              </small>
                              <span className="text-[14px] leading-snug">
                                {text(topic.topicName)}
                              </span>
                            </span>
                            <div className="flex shrink-0 flex-[2] items-center justify-end">
                              {topic.refDocUrl ? (
                                <button
                                  type="button"
                                  className="inline-flex h-[25px] w-[25px] items-center justify-center"
                                  onClick={() => void viewFile(topic)}
                                  disabled={busy}
                                  aria-label="View file"
                                >
                                  <img
                                    src={FILE_ICON}
                                    alt=""
                                    className="h-[25px] w-[25px] object-contain"
                                  />
                                </button>
                              ) : canUpload ? (
                                <>
                                  <button
                                    type="button"
                                    className="inline-flex h-[25px] w-[25px] cursor-pointer items-center justify-center"
                                    onClick={() =>
                                      docInputRefs.current[docId]?.click()
                                    }
                                    disabled={busy}
                                    aria-label="Upload document"
                                  >
                                    <img
                                      src={UPLOAD_ICON}
                                      alt=""
                                      className="h-[25px] w-[25px] object-contain"
                                    />
                                  </button>
                                  <input
                                    ref={(el) => {
                                      docInputRefs.current[docId] = el;
                                    }}
                                    id={docId}
                                    type="file"
                                    accept=".png,.jpg,.jpeg,.pdf,.doc"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      e.target.value = "";
                                      if (file)
                                        void fileUpload(file, unit, topic);
                                    }}
                                  />
                                </>
                              ) : null}
                            </div>
                          </div>
                        );
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
          setPlayOpen(false);
          setPlayData(null);
        }}
        onSelectTopic={(topic) => void onSelectPlaylistTopic(topic)}
      />
    </PageContainer>
  );
}
