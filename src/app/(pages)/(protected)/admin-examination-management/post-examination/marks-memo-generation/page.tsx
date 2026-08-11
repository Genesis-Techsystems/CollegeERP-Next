"use client";

import { useEffect, useState } from "react";
import { PageContainer } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  domainList,
  buildQuery,
  generateMarksMemoData,
} from "@/services";

type AnyRow = Record<string, any>;

export default function MarksMemoGenerationPage() {
  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [courses, setCourses] = useState<AnyRow[]>([]);
  const [examsList, setExamsList] = useState<AnyRow[]>([]);
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);

  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [examId, setExamId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<string>("0");
  const [courseYearId, setCourseYearId] = useState<string>("0");

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Load Colleges on mount
  useEffect(() => {
    setLoading(true);
    domainList<AnyRow>("College", buildQuery({ isActive: true }))
      .then((res) => setColleges(Array.isArray(res) ? res : []))
      .catch((err) => {
        setColleges([]);
        toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
      })
      .finally(() => setLoading(false));
  }, []);

  // College Change
  const handleCollegeChange = async (val: string | null) => {
    setCollegeId(val);
    setAcademicYearId(null);
    setCourseId(null);
    setExamId(null);
    setCourseGroupId("0");
    setCourseYearId("0");
    setAcademicYears([]);
    setCourses([]);
    setExamsList([]);
    setCourseGroups([]);
    setCourseYears([]);

    if (!val) return;

    try {
      const ayList = await domainList<AnyRow>(
        "AcademicYear",
        buildQuery({ collegeId: Number(val), isActive: true }, undefined, {
          fromDate: "DESC",
        }),
      );
      setAcademicYears(Array.isArray(ayList) ? ayList : []);
    } catch (err) {
      setAcademicYears([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    }
  };

  // Academic Year Change
  const handleAcademicYearChange = async (val: string | null) => {
    setAcademicYearId(val);
    setCourseId(null);
    setExamId(null);
    setCourseGroupId("0");
    setCourseYearId("0");
    setCourses([]);
    setExamsList([]);
    setCourseGroups([]);
    setCourseYears([]);

    if (!val || !collegeId) return;

    try {
      const crsList = await domainList<AnyRow>(
        "Course",
        buildQuery({ collegeId: Number(collegeId), isActive: true }),
      );
      setCourses(Array.isArray(crsList) ? crsList : []);
    } catch (err) {
      setCourses([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    }
  };

  // Course Change
  const handleCourseChange = async (val: string | null) => {
    setCourseId(val);
    setExamId(null);
    setCourseGroupId("0");
    setCourseYearId("0");
    setExamsList([]);
    setCourseGroups([]);
    setCourseYears([]);

    if (!val || !collegeId || !academicYearId) return;

    try {
      const [exList, cyList] = await Promise.all([
        domainList<AnyRow>(
          "ExamMaster",
          buildQuery(
            {
              collegeId: Number(collegeId),
              academicYearId: Number(academicYearId),
              courseId: Number(val),
              isActive: true,
            },
            undefined,
            { createdDt: "DESC" },
          ),
        ),
        domainList<AnyRow>(
          "CourseYear",
          buildQuery(
            { courseId: Number(val), isActive: true },
            undefined,
            { sortOrder: "ASC" },
          ),
        ),
      ]);
      const filteredExams = (Array.isArray(exList) ? exList : []).filter(
        (e) => !e.isInternalExam,
      );
      setExamsList(filteredExams);
      setCourseYears(Array.isArray(cyList) ? cyList : []);
    } catch (err) {
      setExamsList([]);
      setCourseYears([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    }
  };

  // Exam Change
  const handleExamChange = async (val: string | null) => {
    setExamId(val);
    setCourseGroupId("0");
    setCourseGroups([]);

    if (!val || !courseId) return;

    try {
      const cgList = await domainList<AnyRow>(
        "CourseGroup",
        buildQuery({ courseId: Number(courseId), isActive: true }),
      );
      setCourseGroups(Array.isArray(cgList) ? cgList : []);
    } catch (err) {
      setCourseGroups([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    }
  };

  // Generate Memo Action
  const handleGenerateMemo = async () => {
    if (!collegeId || !academicYearId || !courseId || !examId) {
      toastError("Please fill in all required fields.");
      return;
    }

    setGenerating(true);
    try {
      const res = await generateMarksMemoData({
        examId: Number(examId),
        courseYearId: Number(courseYearId) || 0,
        courseGroupId: Number(courseGroupId) || 0,
        studentId: 0,
      });

      if (res?.statusCode === 500 || res?.success === false) {
        toastError(res?.message || "Internal Server error. Please contact system admin.");
      } else {
        toastSuccess(res?.message || "Memo Generated Successfully.");
      }
    } catch (err) {
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <PageContainer>
      <div className="app-card overflow-hidden p-3 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-2 border-b border-[#dedede] pb-2 mb-3">
          <span className="material-icons text-[#0f2d59]" style={{ fontSize: 20 }}>
            money
          </span>
          <h1 className="text-[16px] font-bold text-[#0f2d59]">
            Exam Marks Memo Generation
          </h1>
        </div>

        {/* Form Controls */}
        <div className="bg-[#f8f9fa] p-4 rounded border border-[#e9ecef] space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-2">
              <Select
                label="College"
                required
                value={collegeId}
                onChange={(v) => void handleCollegeChange(v)}
                options={colleges.map((c) => ({
                  value: String(c.collegeId),
                  label: c.collegeCode ?? String(c.collegeId),
                }))}
                placeholder="Select College"
                isLoading={loading}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                label="Exam Year"
                required
                value={academicYearId}
                onChange={(v) => void handleAcademicYearChange(v)}
                options={academicYears.map((a) => ({
                  value: String(a.academicYearId),
                  label: a.academicYear ?? String(a.academicYearId),
                }))}
                placeholder="Select Exam Year"
                disabled={!collegeId}
              />
            </div>
            <div className="md:col-span-2">
              <Select
                label="Course"
                required
                value={courseId}
                onChange={(v) => void handleCourseChange(v)}
                options={courses.map((c) => ({
                  value: String(c.courseId),
                  label: c.courseCode ?? String(c.courseId),
                }))}
                placeholder="Select Course"
                disabled={!academicYearId}
              />
            </div>
            <div className="md:col-span-6">
              <Select
                label="Exam"
                required
                value={examId}
                onChange={(v) => void handleExamChange(v)}
                options={examsList.map((e) => ({
                  value: String(e.examId),
                  label: `${e.examName ?? ""} (${e.fromDate ?? ""} - ${e.toDate ?? ""})`,
                }))}
                placeholder="Select Exam"
                searchable
                disabled={!courseId}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-3">
              <Select
                label="Course Group"
                value={courseGroupId}
                onChange={(v) => setCourseGroupId(v ?? "0")}
                options={[
                  { value: "0", label: "Select" },
                  ...courseGroups.map((cg) => ({
                    value: String(cg.courseGroupId),
                    label: cg.groupCode ?? String(cg.courseGroupId),
                  })),
                ]}
                placeholder="Select Course Group"
                disabled={!examId}
              />
            </div>
            <div className="md:col-span-3">
              <Select
                label="Course Year"
                value={courseYearId}
                onChange={(v) => setCourseYearId(v ?? "0")}
                options={[
                  { value: "0", label: "Select" },
                  ...courseYears.map((cy) => ({
                    value: String(cy.courseYearId),
                    label: cy.courseYearName ?? String(cy.courseYearId),
                  })),
                ]}
                placeholder="Select Course Year"
                disabled={!examId}
              />
            </div>
            <div className="md:col-span-2">
              <Button
                className="h-9 w-full bg-[#0f2d59] text-white hover:bg-[#0c2340]"
                onClick={() => void handleGenerateMemo()}
                disabled={generating || !examId}
              >
                {generating ? "Generating..." : "Generate"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}
