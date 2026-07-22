"use client";

import { useCallback, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toastError } from "@/lib/toast";
import {
  listStudentFeeStructuresByStudent,
  searchStudentsForCertificate,
} from "@/services";
import type { StudentFeeSearchRow } from "@/types/fees-collection";

export function isEmptyStudent(student: StudentFeeSearchRow | null): boolean {
  return !student || Object.keys(student).length === 0;
}

export function useCertificateStudent() {
  const [studentId, setStudentId] = useState<number | null>(null);
  const [students, setStudents] = useState<StudentFeeSearchRow[]>([]);
  const [selectedStudent, setSelectedStudent] =
    useState<StudentFeeSearchRow | null>(null);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);

  const studentNum = Number(studentId ?? 0);

  useQuery({
    queryKey: ["Certificate", "studentFeeList", studentNum],
    queryFn: () => listStudentFeeStructuresByStudent(studentNum),
    enabled: studentNum > 0,
  });

  const onStudentSearch = useCallback(async (term: string) => {
    const q = term.trim();
    if (q.length < 5) {
      setStudents([]);
      return;
    }

    setStudentSearchLoading(true);
    try {
      const rows = await searchStudentsForCertificate(q);
      setStudents(rows);
    } catch (error) {
      toastError(error, "Student search failed");
      setStudents([]);
    } finally {
      setStudentSearchLoading(false);
    }
  }, []);

  const handleStudentChange = useCallback(
    (id: number | null, student: Record<string, unknown> | null) => {
      setStudentId(id);
      setSelectedStudent(student as StudentFeeSearchRow | null);
      if (!id) setStudents([]);
    },
    [],
  );

  return {
    studentId,
    students,
    selectedStudent,
    studentSearchLoading,
    onStudentSearch,
    handleStudentChange,
  };
}
