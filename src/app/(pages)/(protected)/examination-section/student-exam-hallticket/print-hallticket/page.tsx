"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getStudentExamHallticketDetail,
  STUDENT_HALLTICKET_PRINT_STORAGE_KEY,
} from "@/services";
import { StudentHallticketPrintView } from "../_print/StudentHallticketPrintView";

type AnyRow = Record<string, unknown>;

function parsePrintData(raw: string | null): AnyRow | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as AnyRow;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function storageMatchesIds(
  data: AnyRow,
  examId: number,
  studentId: number,
): boolean {
  const storedExam = Number(data.examId ?? data.exam_id ?? 0);
  const storedStudent = Number(data.studentId ?? data.student_id ?? 0);
  if (examId > 0 && storedExam > 0 && storedExam !== examId) return false;
  if (studentId > 0 && storedStudent > 0 && storedStudent !== studentId) {
    return false;
  }
  return true;
}

export default function StudentExamHallticketPrintPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const examId = Number(searchParams.get("examId") ?? 0);
  const studentId = Number(searchParams.get("studentId") ?? 0);

  const [data, setData] = useState<AnyRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);

      if (typeof globalThis !== "undefined") {
        const fromStorage = parsePrintData(
          globalThis.sessionStorage.getItem(
            STUDENT_HALLTICKET_PRINT_STORAGE_KEY,
          ),
        );
        if (fromStorage && storageMatchesIds(fromStorage, examId, studentId)) {
          if (!cancelled) {
            setData(fromStorage);
            setLoading(false);
          }
          return;
        }
      }

      if (examId > 0 && studentId > 0) {
        const result = await getStudentExamHallticketDetail(examId, studentId);
        if (!cancelled) {
          setData(result?.detail ?? null);
        }
      } else if (!cancelled) {
        setData(null);
      }

      if (!cancelled) setLoading(false);
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [examId, studentId]);

  function handleBack() {
    const qs = new URLSearchParams();
    if (examId > 0) qs.set("examId", String(examId));
    if (studentId > 0) qs.set("studentId", String(studentId));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    router.push(`/examination-section/student-exam-hallticket${suffix}`);
  }

  function handlePrint() {
    // Angular printPage() — window.print(); wait for paint so sheet is not blank.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
      });
    });
  }

  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Loading hall ticket…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-sm text-amber-700">
          No hall ticket data found. Go back and select an exam first.
        </p>
        <Button type="button" variant="outline" onClick={handleBack}>
          Back
        </Button>
      </div>
    );
  }

  return (
    <StudentHallticketPrintView
      data={data}
      actions={
        <>
          <Button
            type="button"
            id="printPageButton"
            variant="outline"
            onClick={handleBack}
          >
            Back
          </Button>
          <Button type="button" id="printPageButton" onClick={handlePrint}>
            Print
          </Button>
        </>
      }
    />
  );
}
