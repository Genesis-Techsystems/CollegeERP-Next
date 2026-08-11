"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import type { ColDef } from "ag-grid-community";
import {
  domainList,
  buildQuery,
  getUnivExamFiltersByType,
  uploadBulkExamMarks,
  postBulkExamMarks,
} from "@/services";

type AnyRow = Record<string, any>;

export default function ExamMarksUpdatePage() {
  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [courses, setCourses] = useState<AnyRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [examsList, setExamsList] = useState<AnyRow[]>([]);
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [regulations, setRegulations] = useState<AnyRow[]>([]);
  const [examFeeTypes, setExamFeeTypes] = useState<AnyRow[]>([]);

  // Selection states
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [examId, setExamId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null);
  const [courseYearId, setCourseYearId] = useState<string | null>(null);
  const [regulationId, setRegulationId] = useState<string | null>(null);
  const [examTypeCatId, setExamTypeCatId] = useState<string | null>(null);
  const [isRevised, setIsRevised] = useState(false);

  // File upload state
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preStaggings, setPreStaggings] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  // Load Colleges & Exam Fee Types on mount
  useEffect(() => {
    domainList<AnyRow>("College", buildQuery({ isActive: true }))
      .then((res) => setColleges(Array.isArray(res) ? res : []))
      .catch((err) => {
        setColleges([]);
        toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
      });

    domainList<AnyRow>(
      "GeneralDetail",
      buildQuery({ generalMasterCode: "EXAMFEETYPE", isActive: true }),
    )
      .then((res) => {
        const list = Array.isArray(res) ? res : [];
        const filtered = list.filter((x) => x.generalDetailCode !== "Internal");
        setExamFeeTypes(filtered);
      })
      .catch(() => setExamFeeTypes([]));
  }, []);

  const selectedCollegeCode = useMemo(() => {
    if (!collegeId) return "";
    const found = colleges.find((c) => String(c.collegeId) === collegeId);
    return found?.collegeCode ?? "";
  }, [colleges, collegeId]);

  // College Change
  const handleCollegeChange = async (val: string | null) => {
    setCollegeId(val);
    setCourseId(null);
    setAcademicYearId(null);
    setExamId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setCourses([]);
    setAcademicYears([]);
    setExamsList([]);
    setCourseGroups([]);
    setCourseYears([]);
    setRegulations([]);
    setPreStaggings([]);

    if (!val) return;

    try {
      const [crsList, ayList] = await Promise.all([
        domainList<AnyRow>(
          "Course",
          buildQuery({ collegeId: Number(val), isActive: true }),
        ),
        domainList<AnyRow>(
          "AcademicYear",
          buildQuery({ collegeId: Number(val), isActive: true }, undefined, {
            fromDate: "DESC",
          }),
        ),
      ]);
      setCourses(Array.isArray(crsList) ? crsList : []);
      setAcademicYears(Array.isArray(ayList) ? ayList : []);
    } catch (err) {
      setCourses([]);
      setAcademicYears([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    }
  };

  // Course Change
  const handleCourseChange = async (val: string | null) => {
    setCourseId(val);
    setCourseGroupId(null);
    setCourseYearId(null);
    setRegulationId(null);
    setCourseGroups([]);
    setCourseYears([]);
    setRegulations([]);
    setPreStaggings([]);

    if (!val) return;

    try {
      const [cgList, cyList, regList] = await Promise.all([
        domainList<AnyRow>(
          "CourseGroup",
          buildQuery({ courseId: Number(val), isActive: true }),
        ),
        domainList<AnyRow>(
          "CourseYear",
          buildQuery(
            { courseId: Number(val), isActive: true },
            undefined,
            { sortOrder: "ASC" },
          ),
        ),
        domainList<AnyRow>(
          "Regulation",
          buildQuery(
            { courseId: Number(val), isActive: true },
            undefined,
            { regulationCode: "DESC" },
          ),
        ),
      ]);
      setCourseGroups(Array.isArray(cgList) ? cgList : []);
      setCourseYears(Array.isArray(cyList) ? cyList : []);
      setRegulations(Array.isArray(regList) ? regList : []);
    } catch (err) {
      setCourseGroups([]);
      setCourseYears([]);
      setRegulations([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    }
  };

  // Academic Year Change
  const handleAcademicYearChange = async (val: string | null) => {
    setAcademicYearId(val);
    setExamId(null);
    setExamsList([]);
    setPreStaggings([]);

    if (!val || !collegeId || !courseId) return;

    try {
      const exList = await domainList<AnyRow>(
        "ExamMaster",
        buildQuery(
          {
            collegeId: Number(collegeId),
            academicYearId: Number(val),
            courseId: Number(courseId),
            isActive: true,
          },
          undefined,
          { createdDt: "DESC" },
        ),
      );
      const filtered = (Array.isArray(exList) ? exList : []).filter(
        (e) => !e.isInternalExam,
      );
      setExamsList(filtered);
    } catch (err) {
      setExamsList([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    }
  };

  const handleUploadFile = async () => {
    if (!fileInputRef.current?.files?.[0]) {
      toastError("Please select a file to upload.");
      return;
    }
    if (
      !collegeId ||
      !courseId ||
      !academicYearId ||
      !examId ||
      !courseGroupId ||
      !courseYearId ||
      !regulationId ||
      !examTypeCatId
    ) {
      toastError("Please fill all required filter fields before uploading.");
      return;
    }

    const file = fileInputRef.current.files[0];
    const formData = new FormData();
    formData.append("file", file, file.name);
    formData.append("collegeId", collegeId);
    formData.append("courseId", courseId);
    formData.append("courseGroupId", courseGroupId);
    formData.append("courseYearId", courseYearId);
    formData.append("regulationId", regulationId);
    formData.append("examId", examId);
    formData.append("isRevaluation", String(isRevised));
    formData.append("examTypeCatId", examTypeCatId);

    setUploading(true);
    setLoading(true);
    try {
      const res = await uploadBulkExamMarks(formData);
      const data = res?.result?.[0] ?? res?.data?.result?.[0] ?? res;
      const rows = Array.isArray(data) ? data : Array.isArray(res) ? res : [];
      setPreStaggings(rows);
      toastSuccess(res?.message ?? "File uploaded successfully.");
    } catch (err) {
      setPreStaggings([]);
      toastError(getErrorMessage(err) || "Failed to upload bulk exam marks.");
    } finally {
      setUploading(false);
      setLoading(false);
    }
  };

  const handlePostExamMarks = async () => {
    if (preStaggings.length === 0) return;
    const uniquecode = preStaggings[0]?.uniquecode;
    if (!uniquecode) {
      toastError("Unique code not found for stagging records.");
      return;
    }

    setPosting(true);
    try {
      await postBulkExamMarks(String(uniquecode));
      toastSuccess("Students are uploaded successfully!");
      setPreStaggings([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toastError(getErrorMessage(err) || "Failed to post exam marks.");
    } finally {
      setPosting(false);
    }
  };

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI No.",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      { field: "uniquecode", headerName: "Unique Code", minWidth: 140 },
      { field: "rollNumber", headerName: "Roll Number", minWidth: 140 },
      { field: "studentName", headerName: "Student Name", minWidth: 180, flex: 1 },
      { field: "subjectCode", headerName: "Subject Code", minWidth: 130 },
      { field: "subjectName", headerName: "Subject Name", minWidth: 180, flex: 1 },
      { field: "marks", headerName: "Marks", width: 90, type: "rightAligned" },
      {
        field: "status",
        headerName: "Status",
        minWidth: 140,
        cellRenderer: (p: any) => (
          <span
            className={`font-semibold ${
              p.value === "SUCCESS" || p.value === "Valid"
                ? "text-green-700"
                : "text-red-600"
            }`}
          >
            {p.value ?? "Pending"}
          </span>
        ),
      },
    ],
    [],
  );

  return (
    <FilteredListPage
      title="Exam Marks Bulk Upload"
      loading={loading}
      resultsVisible={preStaggings.length > 0}
      hideEmptyGrid={true}
      rowData={preStaggings}
      columnDefs={columnDefs}
      filters={
        <div className="space-y-4">
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
                disabled={!collegeId}
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
                disabled={!collegeId || !courseId}
              />
            </div>

            <div className="md:col-span-6">
              <Select
                label="Exam"
                required
                value={examId}
                onChange={(v) => setExamId(v)}
                options={examsList.map((e) => ({
                  value: String(e.examId),
                  label: `${e.examName ?? ""} (${e.fromDate ?? ""} - ${e.toDate ?? ""})`,
                }))}
                placeholder="Select Exam"
                searchable
                disabled={!academicYearId}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-2">
              <Select
                label="Course Group"
                required
                value={courseGroupId}
                onChange={(v) => setCourseGroupId(v)}
                options={courseGroups.map((cg) => ({
                  value: String(cg.courseGroupId),
                  label: cg.groupCode ?? String(cg.courseGroupId),
                }))}
                placeholder="Select Course Group"
                disabled={!courseId}
              />
            </div>

            <div className="md:col-span-2">
              <Select
                label="Course Year"
                required
                value={courseYearId}
                onChange={(v) => setCourseYearId(v)}
                options={courseYears.map((cy) => ({
                  value: String(cy.courseYearId),
                  label: cy.courseYearName ?? String(cy.courseYearId),
                }))}
                placeholder="Select Course Year"
                disabled={!courseId}
              />
            </div>

            <div className="md:col-span-2">
              <Select
                label="Regulation"
                required
                value={regulationId}
                onChange={(v) => setRegulationId(v)}
                options={regulations.map((r) => ({
                  value: String(r.regulationId),
                  label: r.regulationName ?? r.regulationCode ?? String(r.regulationId),
                }))}
                placeholder="Select Regulation"
                disabled={!courseId}
              />
            </div>

            <div className="md:col-span-3">
              <Select
                label="Exam Type"
                required
                value={examTypeCatId}
                onChange={(v) => setExamTypeCatId(v)}
                options={examFeeTypes.map((t) => ({
                  value: String(t.generalDetailId),
                  label: t.generalDetailDisplayName ?? String(t.generalDetailId),
                }))}
                placeholder="Select Exam Type"
              />
            </div>

            <div className="md:col-span-3 flex items-center gap-2 pb-2">
              <Checkbox
                checked={isRevised}
                onCheckedChange={(c) => setIsRevised(!!c)}
              />
              <label className="text-xs font-semibold text-slate-700">
                Is Revaluation
              </label>
            </div>
          </div>

          <div className="pt-2 border-t flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-gray-700">
              Upload Marks :
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx"
              className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
            />
            <Button
              type="button"
              className="bg-[#0f2d59] text-white hover:bg-[#0c2340] h-8 text-xs px-4"
              onClick={() => void handleUploadFile()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            {selectedCollegeCode === "VEC" && (
              <Button
                type="button"
                variant="outline"
                className="h-8 text-xs px-4"
                onClick={() => {
                  window.open("/assets/docs/Intermarks_Bulk_Upload_Sample.xlsx", "_blank");
                }}
              >
                Download Sample XL
              </Button>
            )}
          </div>
        </div>
      }
      toolbar={
        preStaggings.length > 0 ? (
          <Button
            className="bg-[#0f2d59] text-white hover:bg-[#0c2340]"
            onClick={() => void handlePostExamMarks()}
            disabled={posting}
          >
            {posting ? "Posting..." : "Post Exam Marks"}
          </Button>
        ) : undefined
      }
    />
  );
}
