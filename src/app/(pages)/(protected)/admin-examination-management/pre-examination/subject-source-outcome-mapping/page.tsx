"use client";

import { useEffect, useMemo, useState } from "react";
import { FilteredListPage } from "@/components/layout";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import type { ColDef } from "ag-grid-community";
import {
  domainList,
  buildQuery,
  getExamSetupMasterList,
  getSubjectSyllabusList,
  getSubjectUnitsByRegulation,
  saveSubjectSourceOutcomeMapping,
} from "@/services";

type AnyRow = Record<string, any>;

export default function SubjectSourceOutcomeMappingPage() {
  const [colleges, setColleges] = useState<AnyRow[]>([]);
  const [academicYears, setAcademicYears] = useState<AnyRow[]>([]);
  const [courses, setCourses] = useState<AnyRow[]>([]);
  const [examsList, setExamsList] = useState<AnyRow[]>([]);
  const [courseGroups, setCourseGroups] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [sections, setSections] = useState<AnyRow[]>([]);
  const [setupMasters, setSetupMasters] = useState<AnyRow[]>([]);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [outcomes, setOutcomes] = useState<AnyRow[]>([]);
  const [units, setUnits] = useState<AnyRow[]>([]);

  // Selections
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [academicYearId, setAcademicYearId] = useState<string | null>(null);
  const [courseId, setCourseId] = useState<string | null>(null);
  const [examId, setExamId] = useState<string | null>(null);
  const [courseGroupId, setCourseGroupId] = useState<string | null>(null);
  const [courseYearId, setCourseYearId] = useState<string | null>(null);
  const [groupSectionId, setGroupSectionId] = useState<string | null>(null);
  const [examFCARSetMasterId, setExamFCARSetMasterId] = useState<
    string | null
  >(null);
  const [subjectId, setSubjectId] = useState<string | null>(null);

  // Table Data & State
  const [setupList, setSetupList] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load Colleges & Outcomes on mount
  useEffect(() => {
    domainList<AnyRow>("College", buildQuery({ isActive: true }))
      .then((res) => setColleges(Array.isArray(res) ? res : []))
      .catch((err) => {
        setColleges([]);
        toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
      });

    domainList<AnyRow>(
      "GeneralDetail",
      buildQuery({ generalMasterCode: "OUTCOME", isActive: true }),
    )
      .then((res) => setOutcomes(Array.isArray(res) ? res : []))
      .catch(() => setOutcomes([]));
  }, []);

  // College Change
  const handleCollegeChange = async (val: string | null) => {
    setCollegeId(val);
    setAcademicYearId(null);
    setCourseId(null);
    setExamId(null);
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setExamFCARSetMasterId(null);
    setSubjectId(null);
    setAcademicYears([]);
    setCourses([]);
    setExamsList([]);
    setCourseGroups([]);
    setCourseYears([]);
    setSections([]);
    setSetupMasters([]);
    setSubjects([]);
    setSetupList([]);

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
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setExamFCARSetMasterId(null);
    setSubjectId(null);
    setCourses([]);
    setExamsList([]);
    setCourseGroups([]);
    setCourseYears([]);
    setSections([]);
    setSetupMasters([]);
    setSubjects([]);
    setSetupList([]);

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
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setExamFCARSetMasterId(null);
    setSubjectId(null);
    setExamsList([]);
    setCourseGroups([]);
    setCourseYears([]);
    setSections([]);
    setSetupMasters([]);
    setSubjects([]);
    setSetupList([]);

    if (!val || !collegeId || !academicYearId) return;

    try {
      const [exList, masters] = await Promise.all([
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
        getExamSetupMasterList(Number(collegeId), Number(val)),
      ]);
      const internalExams = (Array.isArray(exList) ? exList : []).filter(
        (e) => e.isInternalExam,
      );
      setExamsList(internalExams);
      setSetupMasters(masters);
    } catch (err) {
      setExamsList([]);
      setSetupMasters([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    }
  };

  // Exam Change
  const handleExamChange = async (val: string | null) => {
    setExamId(val);
    setCourseGroupId(null);
    setCourseYearId(null);
    setGroupSectionId(null);
    setSubjectId(null);
    setCourseGroups([]);
    setCourseYears([]);
    setSections([]);
    setSubjects([]);
    setSetupList([]);

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

  // Course Group Change
  const handleCourseGroupChange = async (val: string | null) => {
    setCourseGroupId(val);
    setCourseYearId(null);
    setGroupSectionId(null);
    setSubjectId(null);
    setCourseYears([]);
    setSections([]);
    setSubjects([]);
    setSetupList([]);

    if (!val || !courseId) return;

    try {
      const cyList = await domainList<AnyRow>(
        "CourseYear",
        buildQuery(
          { courseId: Number(courseId), isActive: true },
          undefined,
          { sortOrder: "ASC" },
        ),
      );
      setCourseYears(Array.isArray(cyList) ? cyList : []);
    } catch (err) {
      setCourseYears([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    }
  };

  // Course Year Change
  const handleCourseYearChange = async (val: string | null) => {
    setCourseYearId(val);
    setGroupSectionId(null);
    setSubjectId(null);
    setSections([]);
    setSubjects([]);
    setSetupList([]);

    if (!val || !academicYearId || !courseGroupId) return;

    try {
      const [secList, subList] = await Promise.all([
        domainList<AnyRow>(
          "GroupSection",
          buildQuery({
            courseYearId: Number(val),
            academicYearId: Number(academicYearId),
            courseGroupId: Number(courseGroupId),
            isActive: true,
          }),
        ),
        domainList<AnyRow>(
          "SubjectRegulation",
          buildQuery({
            "CourseGroup.courseGroupId": Number(courseGroupId),
            "CourseYear.courseYearId": Number(val),
            "AcademicYear.academicYearId": Number(academicYearId),
            isActive: true,
          }),
        ),
      ]);
      setSections(Array.isArray(secList) ? secList : []);
      setSubjects(Array.isArray(subList) ? subList : []);
    } catch (err) {
      setSections([]);
      setSubjects([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    }
  };

  // Subject Change
  const handleSubjectChange = async (val: string | null) => {
    setSubjectId(val);
    setSetupList([]);

    if (!val || !collegeId || !examFCARSetMasterId) return;

    setLoading(true);
    try {
      const foundSub = subjects.find((s) => String(s.subjectId) === val);
      if (foundSub?.subjectRegulationId) {
        const uList = await getSubjectUnitsByRegulation(
          Number(foundSub.subjectRegulationId),
        );
        setUnits(uList);
      }

      // Fetch Setup Details
      const details = await domainList<AnyRow>(
        "ExamFCARSetupDetail",
        buildQuery({
          collegeId: Number(collegeId),
          "ExamFCARSetupMaster.examFCARSetMasterId": Number(examFCARSetMasterId),
          isActive: true,
        }),
      );

      // Fetch existing syllabus details mapping
      const syllabusList = await getSubjectSyllabusList(Number(collegeId));

      const processed = (Array.isArray(details) ? details : []).map((det) => {
        const existing = syllabusList.find(
          (x) =>
            String(x.examFCARSetDetId) === String(det.examFCARSetDetId) &&
            String(x.subjectId) === String(val) &&
            String(x.examId) === String(examId) &&
            String(x.courseGroupId) === String(courseGroupId) &&
            String(x.courseYearId) === String(courseYearId) &&
            String(x.groupSectionId) === String(groupSectionId),
        );

        return {
          ...det,
          examFCARSubSyllabusId: existing?.examFCARSubSyllabusId ?? null,
          subjectUnitsId: existing?.subjectUnitsId
            ? String(existing.subjectUnitsId)
            : "",
          courseOutcomeCatdetId: existing?.courseOutcomeCatdetId
            ? String(existing.courseOutcomeCatdetId)
            : "",
          createdUser: existing?.createdUser ?? null,
          createdDt: existing?.createdDt ?? null,
        };
      });

      setSetupList(processed);
    } catch (err) {
      setSetupList([]);
      toastError(getErrorMessage(err) || "Internal Server error. Please contact system admin.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnitChange = (rowIndex: number, unitVal: string) => {
    setSetupList((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, subjectUnitsId: unitVal } : row,
      ),
    );
  };

  const handleOutcomeChange = (rowIndex: number, outcomeVal: string) => {
    setSetupList((prev) =>
      prev.map((row, idx) =>
        idx === rowIndex ? { ...row, courseOutcomeCatdetId: outcomeVal } : row,
      ),
    );
  };

  const handleSave = async () => {
    if (
      !collegeId ||
      !courseYearId ||
      !courseGroupId ||
      !examId ||
      !subjectId
    ) {
      toastError("Please complete all required filter selections before saving.");
      return;
    }

    setSaving(true);
    try {
      const jsonPayload = setupList.map((row) => ({
        examFCARSubSyllabusId: row.examFCARSubSyllabusId ?? null,
        createdUser: row.createdUser ?? null,
        createdDt: row.createdDt ?? null,
        configuredOn: new Date().toISOString(),
        collegeId: Number(collegeId),
        configempId: 0,
        examFCARSetDetId: Number(row.examFCARSetDetId),
        courseYearId: Number(courseYearId),
        courseGroupId: Number(courseGroupId),
        groupSectionId: groupSectionId ? Number(groupSectionId) : null,
        examId: Number(examId),
        subUnitTopicIds: null,
        subjectUnitsId: row.subjectUnitsId ? Number(row.subjectUnitsId) : null,
        courseOutcomeCatdetId: row.courseOutcomeCatdetId
          ? Number(row.courseOutcomeCatdetId)
          : null,
        subjectId: Number(subjectId),
        isActive: true,
      }));

      await saveSubjectSourceOutcomeMapping(jsonPayload);
      toastSuccess("Subject Source Outcome Mapping saved successfully.");
      if (subjectId) void handleSubjectChange(subjectId);
    } catch (err) {
      toastError(getErrorMessage(err) || "Failed to save mapping.");
    } finally {
      setSaving(false);
    }
  };

  const isFilterComplete = Boolean(
    collegeId &&
      academicYearId &&
      courseId &&
      examId &&
      courseGroupId &&
      courseYearId &&
      examFCARSetMasterId &&
      subjectId,
  );

  const columnDefs = useMemo<ColDef<AnyRow>[]>(
    () => [
      {
        headerName: "SI No.",
        valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
        width: 70,
        flex: 0,
      },
      { field: "question", headerName: "Question", minWidth: 200, flex: 1 },
      { field: "optionName", headerName: "Option Name", minWidth: 140 },
      { field: "marks", headerName: "Marks", width: 90, type: "rightAligned" },
      {
        headerName: "Subject Units",
        minWidth: 180,
        cellRenderer: (p: any) => {
          const rowIndex = p.node?.rowIndex ?? 0;
          return (
            <select
              className="w-full h-8 text-xs border border-gray-300 rounded px-1"
              value={p.data?.subjectUnitsId ?? ""}
              onChange={(e) => handleUnitChange(rowIndex, e.target.value)}
            >
              <option value="">Select Unit</option>
              {units.map((u) => (
                <option key={u.subjectUnitsId} value={String(u.subjectUnitsId)}>
                  {u.unitName ?? u.unitNumber ?? String(u.subjectUnitsId)}
                </option>
              ))}
            </select>
          );
        },
      },
      {
        headerName: "Course Outcome",
        minWidth: 180,
        cellRenderer: (p: any) => {
          const rowIndex = p.node?.rowIndex ?? 0;
          return (
            <select
              className="w-full h-8 text-xs border border-gray-300 rounded px-1"
              value={p.data?.courseOutcomeCatdetId ?? ""}
              onChange={(e) => handleOutcomeChange(rowIndex, e.target.value)}
            >
              <option value="">Select Outcome</option>
              {outcomes.map((o) => (
                <option key={o.generalDetailId} value={String(o.generalDetailId)}>
                  {o.generalDetailName ?? String(o.generalDetailId)}
                </option>
              ))}
            </select>
          );
        },
      },
    ],
    [units, outcomes],
  );

  return (
    <FilteredListPage
      title="Subject Source Outcome Mapping"
      loading={loading}
      resultsVisible={isFilterComplete}
      hideEmptyGrid={true}
      rowData={setupList}
      columnDefs={columnDefs}
      filters={
        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-2">
              <Select
                label="College"
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
                label="Exam Year"
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
            <div className="md:col-span-3">
              <Select
                label="Exam"
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
            <div className="md:col-span-3">
              <Select
                label="Course Group"
                value={courseGroupId}
                onChange={(v) => void handleCourseGroupChange(v)}
                options={courseGroups.map((cg) => ({
                  value: String(cg.courseGroupId),
                  label: cg.groupCode ?? String(cg.courseGroupId),
                }))}
                placeholder="Select Course Group"
                disabled={!examId}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
            <div className="md:col-span-3">
              <Select
                label="Course Year"
                value={courseYearId}
                onChange={(v) => void handleCourseYearChange(v)}
                options={courseYears.map((cy) => ({
                  value: String(cy.courseYearId),
                  label: cy.courseYearName ?? String(cy.courseYearId),
                }))}
                placeholder="Select Course Year"
                disabled={!courseGroupId}
              />
            </div>
            <div className="md:col-span-3">
              <Select
                label="Section"
                value={groupSectionId}
                onChange={(v) => setGroupSectionId(v)}
                options={sections.map((s) => ({
                  value: String(s.groupSectionId),
                  label: s.sectionName ?? String(s.groupSectionId),
                }))}
                placeholder="Select Section"
                disabled={!courseYearId}
              />
            </div>
            <div className="md:col-span-3">
              <Select
                label="Marks Setup"
                value={examFCARSetMasterId}
                onChange={(v) => setExamFCARSetMasterId(v)}
                options={setupMasters.map((m) => ({
                  value: String(m.examFCARSetMasterId),
                  label: m.markSetupName ?? String(m.examFCARSetMasterId),
                }))}
                placeholder="Select Marks Setup"
                disabled={!courseId}
              />
            </div>
            <div className="md:col-span-3">
              <Select
                label="Subject"
                value={subjectId}
                onChange={(v) => void handleSubjectChange(v)}
                options={subjects.map((s) => ({
                  value: String(s.subjectId),
                  label: s.subjectName ?? String(s.subjectId),
                }))}
                placeholder="Select Subject"
                disabled={!examFCARSetMasterId || !courseYearId}
              />
            </div>
          </div>
        </div>
      }
      toolbar={
        isFilterComplete ? (
          <Button
            className="bg-[#0f2d59] text-white hover:bg-[#0c2340]"
            onClick={() => void handleSave()}
            disabled={saving || setupList.length === 0}
          >
            {saving ? "Saving..." : "Save Mapping"}
          </Button>
        ) : undefined
      }
    />
  );
}
