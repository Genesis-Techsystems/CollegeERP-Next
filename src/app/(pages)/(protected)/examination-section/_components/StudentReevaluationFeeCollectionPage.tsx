"use client";

/**
 * Angular `student-exam-section/student-reevaluation-fee-collection`
 * → `/examination-section/student-reevaluation-registration`.
 */
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSessionContext } from "@/context/SessionContext";
import { setSecuredValue, utcMidnightIso } from "@/common/generic-functions";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  fetchStudentDetail,
  fetchStudentDetailByUserId,
  getExamRevisionStdDetailsBundle,
  initiatePayment,
  listExamRevisionTypes,
  listPaymentModes,
  listStudentExamsForRevaluationFee,
  mergeRevaluationReceiptRows,
  saveStgOnlineExamFeeReceipt,
  searchStudentsByKeyword,
  syncPresentDateFromDashboard,
} from "@/services";
import { saveReEvalReceiptPrintPayload } from "../student-reevaluation-registration/_print/store";

type AnyRow = Record<string, any>;

function numFrom(row: AnyRow | null | undefined, keys: string[]): number {
  for (const key of keys) {
    const val = Number(row?.[key]);
    if (Number.isFinite(val) && val > 0) return val;
  }
  return 0;
}

function strFrom(row: AnyRow | null | undefined, keys: string[]): string {
  for (const key of keys) {
    const val = String(row?.[key] ?? "").trim();
    if (val) return val;
  }
  return "";
}

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function presentDateYmd(): string {
  const raw = String(
    globalThis?.localStorage?.getItem("presentDate") ?? "",
  ).trim();
  if (raw) {
    const parts = raw.split("-");
    if (parts.length === 3 && parts[2]?.length === 4) {
      const [d, m, y] = parts;
      return `${y}-${m}-${d}`;
    }
    if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  }
  return todayYmd();
}

function PayUnderlineField({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={["pay-extra-field", className].filter(Boolean).join(" ")}>
      <label>{label}</label>
      <input
        className="pay-extra"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function selectedFeeSubjects(rows: AnyRow[]): AnyRow[] {
  return rows.filter(
    (row) => row.checked === true && Number(row.already_reg) !== 1,
  );
}

function uniqueByCourseYear(rows: AnyRow[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const item of rows) {
    const id = numFrom(item, ["fk_course_year_id"]);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ ...item, check: true });
  }
  return out;
}

function uniqueBySubject(rows: AnyRow[]): AnyRow[] {
  const seen = new Set<number>();
  const out: AnyRow[] = [];
  for (const item of rows) {
    const id = numFrom(item, ["fk_subject_id"]);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

function formatReceiptDate(value: string): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StudentReevaluationFeeContent() {
  const { user, isLoading: sessionLoading } = useSessionContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const mountedRef = useRef(false);

  const [loading, setLoading] = useState(false);
  const [paying, setPaying] = useState(false);
  const [student, setStudent] = useState<AnyRow | null>(null);
  const [exams, setExams] = useState<AnyRow[]>([]);
  const [examId, setExamId] = useState("");
  const [revisionTypes, setRevisionTypes] = useState<AnyRow[]>([]);
  const [revisionTypeId, setRevisionTypeId] = useState("");
  const [detailsList, setDetailsList] = useState<AnyRow[]>([]);
  const [courseYears, setCourseYears] = useState<AnyRow[]>([]);
  const [checkCourse, setCheckCourse] = useState(true);
  const [subjects, setSubjects] = useState<AnyRow[]>([]);
  const [checkSubject, setCheckSubject] = useState(false);
  const [subjectSearch, setSubjectSearch] = useState("");
  const [cart, setCart] = useState<AnyRow[]>([]);
  const [paymentReady, setPaymentReady] = useState(false);
  const [paymentModes, setPaymentModes] = useState<AnyRow[]>([]);
  const [paymentModeCatId, setPaymentModeCatId] = useState("");
  const [receiptDate, setReceiptDate] = useState<Date | null>(new Date());
  const [feeComments, setFeeComments] = useState("");
  const [chequeNo, setChequeNo] = useState("");
  const [ddno, setDdno] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [otherPaymentNumber, setOtherPaymentNumber] = useState("");
  const [transactionNo, setTransactionNo] = useState("");
  const [receipts, setReceipts] = useState<
    ReturnType<typeof mergeRevaluationReceiptRows>
  >([]);
  const [viewSubjects, setViewSubjects] = useState<AnyRow[]>([]);
  const [viewOpen, setViewOpen] = useState(false);
  const [viewSearch, setViewSearch] = useState("");

  const studentId = numFrom(student, ["studentId", "student_id"]);
  const eachFee = Number(courseYears[0]?.fee ?? 0) || 0;
  const amount = cart.length * eachFee;
  const paymentModeNum = Number(paymentModeCatId) || 0;

  useEffect(() => {
    if (!paymentReady) return;
    setCart(selectedFeeSubjects(subjects));
  }, [subjects, paymentReady]);

  const examOptions = useMemo<SelectOption[]>(
    () =>
      exams.map((exam) => ({
        value: String(numFrom(exam, ["fk_exam_id", "examId"])),
        label: strFrom(exam, ["exam_name", "examName"]) || "Exam",
      })),
    [exams],
  );

  const revisionOptions = useMemo<SelectOption[]>(
    () =>
      revisionTypes.map((row) => ({
        value: String(numFrom(row, ["generalDetailId"])),
        label: strFrom(row, ["generalDetailDisplayName", "generalDetailName"]),
      })),
    [revisionTypes],
  );

  const paymentOptions = useMemo<SelectOption[]>(
    () =>
      paymentModes.map((row) => ({
        value: String(numFrom(row, ["generalDetailId"])),
        label: strFrom(row, ["generalDetailDisplayName"]),
      })),
    [paymentModes],
  );

  const filteredSubjects = useMemo(() => {
    const q = subjectSearch.trim().toLowerCase();
    if (!q) return subjects;
    return subjects.filter((row) => {
      const code = strFrom(row, ["subject_code", "subjectCode"]).toLowerCase();
      const name = strFrom(row, ["subject_name", "subjectName"]).toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [subjects, subjectSearch]);

  const filteredViewSubjects = useMemo(() => {
    const q = viewSearch.trim().toLowerCase();
    if (!q) return viewSubjects;
    return viewSubjects.filter((row) => {
      const code = strFrom(row, ["subject_code", "subjectCode"]).toLowerCase();
      const name = strFrom(row, ["subject_name", "subjectName"]).toLowerCase();
      return code.includes(q) || name.includes(q);
    });
  }, [viewSubjects, viewSearch]);

  const applyAlreadyReg = useCallback((rows: AnyRow[]) => {
    return rows
      .map((item) => ({
        ...item,
        disabled: Number(item.already_reg) === 1,
        checked: Number(item.already_reg) === 1 ? false : Boolean(item.checked),
      }))
      .sort((a, b) => Number(a.order_no ?? 0) - Number(b.order_no ?? 0));
  }, []);

  const loadStudent = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      void syncPresentDateFromDashboard();
      let row: AnyRow | null = null;
      const roll = String(
        (typeof globalThis.window !== "undefined"
          ? globalThis.localStorage.getItem("rollNumber")
          : "") ?? "",
      ).trim();
      if (roll.length > 4) {
        const matches = await searchStudentsByKeyword(roll);
        const storedId = Number(
          globalThis.localStorage.getItem("studentId") ?? 0,
        );
        row =
          matches.find((s) => numFrom(s, ["studentId"]) === storedId) ??
          matches[0] ??
          null;
      }
      if (!row && user.studentId)
        row = await fetchStudentDetail(user.studentId);
      if (!row && user.userId) {
        row = await fetchStudentDetailByUserId(user.userId);
      }
      if (!mountedRef.current) return;
      if (!row) {
        toastInfo("Could not load your student profile.");
        return;
      }
      setStudent(row);
      const sid = numFrom(row, ["studentId"]);
      const examRows = await listStudentExamsForRevaluationFee(sid, 0);
      if (!mountedRef.current) return;
      setExams(examRows);
      const modes = (await listPaymentModes()).filter(
        (m) => strFrom(m, ["generalDetailCode"]).toUpperCase() === "ONLINE",
      );
      if (!mountedRef.current) return;
      setPaymentModes(modes);
      const onlineId = numFrom(modes[0], ["generalDetailId"]);
      setPaymentModeCatId(String(onlineId || 131));

      const paramExam = Number(searchParams.get("examId") ?? 0);
      if (paramExam > 0) setExamId(String(paramExam));
      else if (examRows.length > 0) {
        setExamId(String(numFrom(examRows[0], ["fk_exam_id", "examId"])));
      }
    } catch (e) {
      if (mountedRef.current) toastError(e, "Failed to load student details");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [user, searchParams]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!sessionLoading && user) void loadStudent();
  }, [sessionLoading, user, loadStudent]);

  useEffect(() => {
    if (!examId) {
      setRevisionTypes([]);
      setRevisionTypeId("");
      return;
    }
    let cancelled = false;
    setRevisionTypeId("");
    setDetailsList([]);
    setCourseYears([]);
    setSubjects([]);
    setCart([]);
    setPaymentReady(false);
    setReceipts([]);
    void (async () => {
      try {
        const rows = await listExamRevisionTypes();
        if (!cancelled) setRevisionTypes(rows);
      } catch (e) {
        if (!cancelled) toastError(e, "Failed to load revision types");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [examId]);

  async function onSelectRevision(id: string) {
    setRevisionTypeId(id);
    setCart([]);
    setPaymentReady(false);
    setCheckSubject(false);
    setSubjectSearch("");
    if (!id || !examId || !studentId) {
      setCourseYears([]);
      setSubjects([]);
      setReceipts([]);
      return;
    }
    setLoading(true);
    try {
      const bundle = await getExamRevisionStdDetailsBundle({
        examId: Number(examId),
        studentId,
      });
      if (!mountedRef.current) return;
      const details = Array.isArray(bundle.detailsList)
        ? bundle.detailsList
        : [];
      setDetailsList(details);
      const revId = Number(id);
      const matched = details.filter(
        (x) =>
          numFrom(x, ["fk_exam_id"]) === Number(examId) &&
          numFrom(x, ["fk_adt_examfeetype_catdet_id"]) === revId,
      );
      const years = uniqueByCourseYear(matched).map((y) => ({
        ...y,
        check: true,
      }));
      setCourseYears(years);
      setCheckCourse(true);
      const fromYears = details.filter((item) =>
        years.some(
          (cy) =>
            numFrom(cy, ["fk_course_year_id"]) ===
              numFrom(item, ["fk_course_year_id"]) &&
            numFrom(item, ["fk_adt_examfeetype_catdet_id"]) === revId,
        ),
      );
      setSubjects(applyAlreadyReg(uniqueBySubject(fromYears)));
      setReceipts(mergeRevaluationReceiptRows(bundle.receiptRows ?? []));
    } catch (e) {
      toastError(e, "Failed to load re-valuation subjects");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }

  function rebuildSubjectsFromYears(years: AnyRow[], allChecked: boolean) {
    const revId = Number(revisionTypeId);
    const selectedYears = years.filter((y) => y.check);
    const fromYears = detailsList.filter((item) =>
      selectedYears.some(
        (cy) =>
          numFrom(cy, ["fk_course_year_id"]) ===
            numFrom(item, ["fk_course_year_id"]) &&
          numFrom(item, ["fk_adt_examfeetype_catdet_id"]) === revId,
      ),
    );
    setSubjects(applyAlreadyReg(uniqueBySubject(fromYears)));
    setCheckCourse(allChecked);
    setCart([]);
    setPaymentReady(false);
    setCheckSubject(false);
  }

  function toggleAllCourseYears(checked: boolean) {
    const next = courseYears.map((y) => ({ ...y, check: checked }));
    setCourseYears(next);
    rebuildSubjectsFromYears(next, checked);
  }

  function toggleCourseYear(yearId: number, checked: boolean) {
    const next = courseYears.map((y) =>
      numFrom(y, ["fk_course_year_id"]) === yearId
        ? { ...y, check: checked }
        : y,
    );
    setCourseYears(next);
    rebuildSubjectsFromYears(
      next,
      next.length > 0 && next.every((y) => y.check),
    );
  }

  function toggleAllSubjects(checked: boolean) {
    setCheckSubject(checked);
    setSubjects((prev) =>
      prev.map((item) => {
        if (Number(item.already_reg) === 1) {
          return { ...item, checked: false, disabled: true };
        }
        return { ...item, checked };
      }),
    );
  }

  function toggleSubject(subjectId: number, checked: boolean) {
    setSubjects((prev) => {
      const next = prev.map((item) => {
        if (numFrom(item, ["fk_subject_id"]) !== subjectId) return item;
        if (Number(item.already_reg) === 1) {
          return { ...item, checked: true, disabled: true };
        }
        return { ...item, checked };
      });
      const selectable = next.filter((item) => Number(item.already_reg) !== 1);
      setCheckSubject(
        selectable.length > 0 && selectable.every((item) => item.checked),
      );
      return next;
    });
  }

  function addData() {
    const selected = selectedFeeSubjects(subjects);
    if (selected.length === 0) {
      toastInfo("Please Selcet Any Course");
      return;
    }
    setPaymentReady(true);
    setCart(selected);
    setChequeNo("");
    setDdno("");
    setReferenceNumber("");
    setOtherPaymentNumber("");
    setTransactionNo("");
  }

  function validExamDate() {
    const examRow =
      exams.find(
        (x) => numFrom(x, ["fk_exam_id", "examId"]) === Number(examId),
      ) ?? null;
    const toDate = strFrom(examRow ?? {}, ["to_date", "toDate"]);
    if (!toDate) {
      toastInfo("No Exam To Date For The Selected Exam");
      return;
    }
    if (presentDateYmd() > toDate.slice(0, 10)) {
      toastInfo("Exam Payment Date Had Expired");
      return;
    }
    addData();
  }

  async function payFee() {
    if (cart.length === 0) {
      toastInfo("Please Selcet Any Course");
      return;
    }
    if (!student || !examId || !revisionTypeId) return;
    const collegeId = numFrom(student, ["collegeId", "college_id"]);
    const head = subjects[0] ?? cart[0] ?? {};
    const sel0 = cart[0] ?? {};
    const receiptIso = utcMidnightIso(receiptDate ?? new Date());
    const subjectIds = cart
      .map((r) => numFrom(r, ["fk_subject_id"]))
      .filter((id) => id > 0)
      .join(",");

    const examRevisionSubjectDTOs = cart.map((row) => ({
      collegeId,
      courseYearId: row.fk_course_year_id,
      courseYearCode: row.course_year_code,
      addtFeeAmount: amount,
      examAddtFeeReceiptId: null,
      addtReceiptNo: row.addt_receipt_no,
      addtReceiptDate: row.receipt_date,
      examMasterId: Number(examId),
      examStdDetId: row.fk_exam_std_det_id,
      examRevisionTypeCatId: Number(revisionTypeId),
      studentDetailId: studentId,
      subjectId: row.fk_subject_id,
      previousMarks: row.subject_marks,
      examtypeCatDetailId: sel0.fk_examtype_catdet_id,
      registrationDate: receiptIso,
      isPublished: true,
      isActive: true,
      stgOnlineExamStudentDetailsDTO: [
        {
          subjectId: row.fk_subject_id,
          isActive: true,
          courseYearId: row.fk_course_year_id,
          collegeId,
          examId: Number(examId),
          examStdDetId: sel0.fk_exam_std_det_id,
        },
      ],
    }));

    const stgOnlineExamRevisionSubjectDto = cart.map((row) => ({
      collegeId,
      courseYearId: row.fk_course_year_id,
      courseYearCode: row.course_year_code,
      addtFeeAmount: amount,
      examAddtFeeReceiptId: null,
      addtReceiptNo: row.addt_receipt_no,
      addtReceiptDate: row.receipt_date,
      examId: Number(examId),
      examStdDetId: row.fk_exam_std_det_id,
      examRevisionTypeCatId: Number(revisionTypeId),
      studentId,
      subjectId: row.fk_subject_id,
      previousMarks: row.subject_marks,
      examtypeCatDetailId: sel0.fk_examtype_catdet_id,
      registrationDate: receiptIso,
      isReevaluationApplied: true,
      isPublished: true,
      isActive: true,
    }));

    const payload: AnyRow = {
      collegeId,
      examFeeReceiptId: null,
      feeReceiptNo: head.fee_receipt_no,
      feeAddtId: head.fk_exam_fee_addt_id,
      courseYearId: sel0.fk_course_year_id,
      examMasterId: Number(examId),
      addtFeeAmount: amount,
      examFeeStructureId: head.pk_exam_fee_structure_id,
      examTotalAmount: amount,
      addtExamFeeTypeCatId: head.fk_adt_examfeetype_catdet_id,
      examRevisionTypeCatId: Number(revisionTypeId),
      collectedEmpId: head.fk_collected_emp_id,
      addtReceiptNo: head.addt_receipt_no,
      addtReceiptDate: head.receipt_date,
      isRefund: head.is_Refund,
      refundEmpId: head.fk_refund_emp_id,
      refundDate: head.refund_date,
      refundReason: head.refund_Reason,
      examFeeAmount: amount,
      receiptDt: receiptIso,
      studentDetailId: studentId,
      paymentModeCatDetId: paymentModeNum,
      referenceNumber,
      chequeNo,
      ddno,
      otherPaymentNumber,
      transactionNo,
      feeComments,
      subjectIds,
      tranCatDetailsId: 686,
      examtypeCatDetailId: sel0.fk_examtype_catdet_id,
      isActive: true,
      reason: null,
      stgOnlineExamStudentsDTO: examRevisionSubjectDTOs,
      stgOnlineExamAdditionalFeeReceipts: [
        {
          collegeId,
          examFeeReceiptId: null,
          feeAddtId: head.fk_exam_fee_addt_id,
          addtExamFeeTypeCatId: sel0.fk_adt_examfeetype_catdet_id,
          collectedEmpId: null,
          refundEmpId: null,
          examRevisionSubId: null,
          courseYearId: sel0.fk_course_year_id,
          addtFeeAmount: amount,
          examAddtFeeReceiptId: null,
          examMasterId: Number(examId),
          examStdDetId: sel0.fk_exam_std_det_id,
          examtypeCatDetailId: sel0.fk_examtype_catdet_id,
          examRevisionTypeCatId: Number(revisionTypeId),
          revisedByEmpId: null,
          studentDetailId: studentId,
          subjectId: null,
          addtReceiptDate: receiptIso,
          subjectTypeId: null,
          regulationId: null,
          updatedUser: null,
          createdUser: null,
          reevaluationEnteredEmpId: null,
          receiptDt: receiptIso,
          paymentModeCatDetId: paymentModeNum,
          referenceNumber,
          chequeNo,
          ddno,
          otherPaymentNumber,
          transactionNo,
          feeComments,
          isActive: true,
          stgOnlineExamRevisionSubjectsDTOList: stgOnlineExamRevisionSubjectDto,
        },
      ],
    };

    setPaying(true);
    try {
      setSecuredValue(
        "paymentRedirectUrl",
        "/examination-section/student-reevaluation-registration",
      );
      setSecuredValue("payFeeDueDetails", { examId: Number(examId) });
      const result = await saveStgOnlineExamFeeReceipt(payload);
      if (!result.success || !result.data) {
        toastError(result.message || "Failed to save re-valuation fee.");
        return;
      }
      toastSuccess(result.message || "Success!");
      let payCollegeId = Number(result.data.collegeId ?? collegeId);
      let feeType = "EXAMFEE";
      const courseCode = String(
        student.courseCode ?? searchParams.get("courseCode") ?? "",
      ).toUpperCase();
      if (courseCode === "PHD") {
        payCollegeId = 0;
        feeType = "PHD";
      }
      const orderId = result.data.orderId;
      setCart([]);
      setPaymentReady(false);
      if (orderId == null || orderId === "") {
        toastError("Order id missing from fee receipt response.");
        return;
      }
      await initiatePayment(amount, orderId, payCollegeId, feeType);
    } catch (e) {
      toastError(e, "Payment initiation failed");
    } finally {
      setPaying(false);
    }
  }

  function printReceipt(row: AnyRow) {
    saveReEvalReceiptPrintPayload({
      ...(row.subjects?.[0] ?? {}),
      ...row,
    });
    router.push(
      "/examination-section/student-reevaluation-registration/print-re-evaluation-receipt",
    );
  }

  if (sessionLoading) {
    return (
      <PageContainer>
        <p className="text-sm text-muted-foreground">Loading…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div className="student-reeval-fee-page" data-no-page-name>
        <section className="student-reeval-fee-page__card">
          <div className="student-reeval-fee-page__header">
            <span className="material-icons" aria-hidden>
              book
            </span>
            <strong>Re-Valuation Fee</strong>
          </div>

          <div className="student-reeval-fee-page__filters">
            <div className="w-full md:w-[40%]">
              <Select
                label="Exam"
                required
                variant="standard"
                searchable
                value={examId || null}
                onChange={(v) => setExamId(v ?? "")}
                options={examOptions}
                placeholder="Exam"
                disabled={loading || exams.length === 0}
              />
            </div>
            <div className="w-full md:w-[20%]">
              <Select
                label="Exam Revision Type"
                variant="standard"
                searchable={false}
                value={revisionTypeId || null}
                onChange={(v) => void onSelectRevision(v ?? "")}
                options={revisionOptions}
                placeholder="Exam Revision Type"
                disabled={loading || !examId}
              />
            </div>
          </div>
        </section>

        {courseYears.length > 0 ? (
          <section className="student-reeval-fee-page__card">
            <div className="student-reeval-fee-page__header">
              <span className="material-icons" aria-hidden>
                book
              </span>
              <strong>Re-Valuation Fee</strong>
            </div>

            <div className="student-reeval-fee-page__split">
              <div className="weeday-bordr">
                <h2>Select Semester</h2>
                <table className="sem-table">
                  <thead>
                    <tr>
                      <th className="sem-check">
                        <input
                          type="checkbox"
                          className="subj-check"
                          checked={checkCourse}
                          onChange={(e) =>
                            toggleAllCourseYears(e.target.checked)
                          }
                        />
                      </th>
                      <th>
                        <span className="all-label">All</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseYears.map((row) => {
                      const id = numFrom(row, ["fk_course_year_id"]);
                      return (
                        <tr key={id}>
                          <td className="sem-check">
                            <input
                              type="checkbox"
                              className="subj-check"
                              checked={Boolean(row.check)}
                              onChange={(e) =>
                                toggleCourseYear(id, e.target.checked)
                              }
                            />
                          </td>
                          <td>{strFrom(row, ["course_year_code"])}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="subjects-card">
                <div className="subjects-toolbar">
                  <input
                    className="subject-search"
                    placeholder="Search"
                    value={subjectSearch}
                    onChange={(e) => setSubjectSearch(e.target.value)}
                  />
                  <div className="each-fee">
                    Each Course Fee - <span>{eachFee} /-</span>
                  </div>
                </div>
                <table className="subj-table">
                  <thead>
                    <tr>
                      <th className="subj-check-col">
                        <label>
                          <input
                            type="checkbox"
                            className="subj-check"
                            checked={checkSubject}
                            onChange={(e) =>
                              toggleAllSubjects(e.target.checked)
                            }
                          />
                          All
                        </label>
                      </th>
                      <th>Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubjects.map((row) => {
                      const id = numFrom(row, ["fk_subject_id"]);
                      return (
                        <tr key={id}>
                          <td className="subj-check-col">
                            <input
                              type="checkbox"
                              className="subj-check"
                              disabled={Boolean(row.disabled)}
                              checked={Boolean(row.checked)}
                              onChange={(e) =>
                                toggleSubject(id, e.target.checked)
                              }
                            />
                          </td>
                          <td>
                            {strFrom(row, ["subject_code"])} -{" "}
                            {strFrom(row, ["subject_name"])}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <div className="save-btn-align">
                  <button
                    type="button"
                    className="add-btn"
                    onClick={validExamDate}
                    disabled={loading}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {cart.length > 0 ? (
          <section className="student-reeval-fee-page__card student-reeval-fee-page__card--flush">
            <div className="pay-card">
              <div className="pay-card__left">
                <table className="subj-table cart-table">
                  <thead>
                    <tr>
                      <th>SI.No</th>
                      <th>Subject</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cart.map((row, i) => (
                      <tr key={numFrom(row, ["fk_subject_id"])}>
                        <td>{i + 1}</td>
                        <td>
                          {strFrom(row, ["subject_code"])} -{" "}
                          {strFrom(row, ["subject_name"])}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="pay-card__right">
                <div className="pay-row pay-row--top">
                  <div className="w-[25%]">
                    <Select
                      label="Pay Mode"
                      required
                      variant="standard"
                      searchable={false}
                      value={paymentModeCatId || null}
                      onChange={(v) => setPaymentModeCatId(v ?? "")}
                      options={paymentOptions}
                      placeholder="Pay Mode"
                    />
                  </div>
                  {paymentModeNum === 133 ? (
                    <PayUnderlineField
                      label="Cheque Number"
                      value={chequeNo}
                      onChange={setChequeNo}
                    />
                  ) : null}
                  {paymentModeNum === 134 ? (
                    <PayUnderlineField
                      label="DD Number"
                      value={ddno}
                      onChange={setDdno}
                    />
                  ) : null}
                  {paymentModeNum === 131 ? (
                    <PayUnderlineField
                      label="Reference Number"
                      value={referenceNumber}
                      onChange={setReferenceNumber}
                    />
                  ) : null}
                  {paymentModeNum === 135 ? (
                    <PayUnderlineField
                      label="Other Payment Number"
                      value={otherPaymentNumber}
                      onChange={setOtherPaymentNumber}
                    />
                  ) : null}
                  {paymentModeNum === 132 ? (
                    <PayUnderlineField
                      label="Transaction Number"
                      value={transactionNo}
                      onChange={setTransactionNo}
                    />
                  ) : null}
                  <div className="amount-wrap">
                    <label>Payment Amount</label>
                    <input
                      className="pay-box"
                      type="number"
                      disabled
                      value={amount}
                    />
                  </div>
                </div>
                <div className="pay-row">
                  <div className="pay-date">
                    <DatePicker
                      label="Payment Date"
                      required
                      variant="standard"
                      value={receiptDate}
                      onChange={setReceiptDate}
                    />
                  </div>
                  <PayUnderlineField
                    className="pay-extra-field--grow"
                    label="Fee Comments"
                    value={feeComments}
                    onChange={setFeeComments}
                  />
                  <button
                    type="button"
                    className="add-btn"
                    disabled={paying}
                    onClick={() => void payFee()}
                  >
                    {paying ? "Paying…" : "Pay fees"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {receipts.length > 0 ? (
          <section className="student-reeval-fee-page__card student-reeval-fee-page__card--flush">
            <div className="receipts-block">
              <div className="table-bac">
                <table className="fee">
                  <thead>
                    <tr>
                      <th style={{ width: "5%" }}>SI No.</th>
                      <th>Semester</th>
                      <th>Receipt No.</th>
                      <th>Payment Date</th>
                      <th>Payment Mode</th>
                      <th className="text-right">Exam Fee (₹)</th>
                      <th className="text-right">Add. Fee (₹)</th>
                      <th className="text-right">LateFee(₹)</th>
                      <th className="text-right">Amount (₹)</th>
                      <th>Subjects</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receipts.map((obj, i) => (
                      <tr key={obj.fk_exam_addt_fee_receipt_id}>
                        <td>{i + 1}</td>
                        <td>{obj.course_year_code}</td>
                        <td>{obj.fee_receipt_no}</td>
                        <td>{formatReceiptDate(obj.receipt_date)}</td>
                        <td>{obj.payment_mode}</td>
                        <td className="text-right">
                          {obj.exam_fee_amount ?? "-"}
                        </td>
                        <td className="text-right">
                          {obj.exam_addt_fee ?? "-"}
                        </td>
                        <td className="text-right">
                          {obj.exam_fine_amount ?? "-"}
                        </td>
                        <td className="text-right">{obj.exam_total_amount}</td>
                        <td>
                          <button
                            type="button"
                            className="courses-btn"
                            onClick={() => {
                              setViewSubjects(obj.subjects ?? []);
                              setViewSearch("");
                              setViewOpen(true);
                            }}
                          >
                            Courses
                          </button>
                        </td>
                        <td className="text-center">
                          <button
                            type="button"
                            className="print-icon"
                            title="Print Receipt"
                            onClick={() => printReceipt(obj)}
                          >
                            <span className="material-icons">print</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ) : null}
      </div>

      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="max-w-[750px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="material-icons text-[#0c51a4]">book</span>
              Subjects List
            </DialogTitle>
          </DialogHeader>
          <input
            className="subject-search mb-3"
            placeholder="Subject Name / Code"
            value={viewSearch}
            onChange={(e) => setViewSearch(e.target.value)}
          />
          <table className="subj-table">
            <thead>
              <tr>
                <th>SI.No</th>
                <th>Subject Name</th>
                <th>Subject Type</th>
                <th>Credits</th>
                <th>Regulation</th>
              </tr>
            </thead>
            <tbody>
              {filteredViewSubjects.map((row, i) => (
                <tr key={`${numFrom(row, ["fk_subject_id"])}-${i}`}>
                  <td>{i + 1}</td>
                  <td>
                    {strFrom(row, ["subject_name"])}{" "}
                    {strFrom(row, ["subject_code"]) ? (
                      <span className="text-[#828282]">
                        ({strFrom(row, ["subject_code"])})
                      </span>
                    ) : null}
                  </td>
                  <td>{strFrom(row, ["subjectTypeCode"])}</td>
                  <td>{strFrom(row, ["credits"])}</td>
                  <td>{strFrom(row, ["regulation_code"])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
}

export function StudentReevaluationFeeCollectionPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </PageContainer>
      }
    >
      <StudentReevaluationFeeContent />
    </Suspense>
  );
}
