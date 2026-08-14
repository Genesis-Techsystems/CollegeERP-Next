"use client";

/**
 * Angular `view-subjects-modal` —
 * GET groupyrregulationdetails?coursegroupId=&courseyearId=&regulationId=
 */

import { useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/common/components/table";
import { listGroupYearRegulationSubjects } from "@/services";

type AnyRow = Record<string, any>;

function pickId(row: AnyRow | null | undefined, keys: string[]): number {
  if (!row) return 0;
  for (const key of keys) {
    const n = Number(row[key] ?? 0);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

const COLS: ColDef<AnyRow>[] = [
  {
    headerName: "No.",
    valueGetter: (p) => (p.node?.rowIndex ?? 0) + 1,
    minWidth: 70,
    maxWidth: 80,
    flex: 0,
  },
  { field: "subjectCode", headerName: "Subject Code", minWidth: 120, flex: 1 },
  {
    field: "subjectName",
    headerName: "Subject Name",
    minWidth: 220,
    flex: 1.3,
  },
  {
    field: "subjecttypeCode",
    headerName: "Subject Type",
    minWidth: 130,
    flex: 1,
  },
  {
    field: "lectures",
    headerName: "Lecture",
    minWidth: 100,
    maxWidth: 110,
    flex: 0,
  },
  {
    field: "tutorials",
    headerName: "Tutorial",
    minWidth: 100,
    maxWidth: 110,
    flex: 0,
  },
  {
    field: "practicals",
    headerName: "Practical",
    minWidth: 100,
    maxWidth: 110,
    flex: 0,
  },
  {
    field: "credits",
    headerName: "Credits",
    minWidth: 90,
    maxWidth: 100,
    flex: 0,
  },
];

export default function ViewSubjectsModal({
  open,
  onClose,
  context,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  context: AnyRow | null;
}>) {
  const [rows, setRows] = useState<AnyRow[]>([]);
  const [loading, setLoading] = useState(false);

  const courseGroupId = pickId(context, [
    "courseGroupId",
    "coursegroupId",
    "pk_course_group_id",
    "fk_course_group_id",
  ]);
  const courseYearId = pickId(context, [
    "courseYearId",
    "courseyearId",
    "pk_course_year_id",
    "fk_course_year_id",
    "course_year_id",
  ]);
  const regulationId = pickId(context, [
    "regulationId",
    "regulationid",
    "pk_regulation_id",
    "fk_regulation_id",
  ]);

  useEffect(() => {
    if (!open) {
      setRows([]);
      return;
    }
    if (!courseGroupId || !courseYearId || !regulationId) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    listGroupYearRegulationSubjects(courseGroupId, courseYearId, regulationId)
      .then((list) => {
        if (!cancelled) setRows(Array.isArray(list) ? list : []);
      })
      .catch(() => {
        if (!cancelled) setRows([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, courseGroupId, courseYearId, regulationId]);

  // Angular: Course : universityName / courseCode / groupCode / courseYearName
  const heading = useMemo(() => {
    if (!context) return "";
    const uni = String(
      context.universityName ?? context.universityCode ?? "",
    ).trim();
    const course = String(
      context.courseCode ?? context.courseName ?? "",
    ).trim();
    const group = String(context.groupCode ?? context.groupName ?? "").trim();
    const year = String(context.courseYearName ?? "").trim();
    return [uni, course, group, year].filter(Boolean).join(" / ");
  }, [context]);

  const pdfTitle = useMemo(() => {
    const base = "University Curriculum Regulation Subjects List";
    return heading ? `${base} - ${heading}` : base;
  }, [heading]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            University Curriculum Regulation Subjects List
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-md border p-3 text-sm">
          <div>
            <span className="font-medium">Course:</span> {heading}
          </div>
          <div>
            <span className="font-medium">Regulation:</span>{" "}
            {context?.regulationName ?? "-"}
          </div>
        </div>

        <div className="app-card p-0 overflow-hidden">
          <DataTable
            rowData={rows}
            columnDefs={COLS}
            loading={loading}
            getRowId={(p) => {
              const d = p.data;
              const pk =
                d?.groupyrRegDetailId ??
                d?.groupYrRegDetailId ??
                d?.subjectId ??
                d?.subjectCode;
              return String(pk ?? `row-${d?.subjectName ?? ""}`);
            }}
            toolbar={{
              search: true,
              searchPlaceholder: "Search",
              pdfDocumentTitle: pdfTitle,
            }}
            pagination
            paginationPageSize={10}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
