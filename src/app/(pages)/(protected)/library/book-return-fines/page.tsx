"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Book } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toDateOnlyISO } from "@/common/generic-functions";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  createLibFineCollection,
  getBookIssueDetailById,
  getLibrarySettingByCode,
  listLibFineTypes,
  updateBookIssueDetails,
  type BookReturnUpdatePayload,
  type LibraryRow,
} from "@/services";
import type { GeneralDetail } from "@/types/exam-master";
import { BookIssueCollapsible } from "../bookIssue/_components/BookIssueCollapsible";

type ActionMode = "1" | "2" | "3";

function formatDisplayDate(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw.slice(0, 10);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function startOfDay(date: Date): Date {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function calcDelayDays(dueDate: Date, returnDate: Date): number {
  const d1 = startOfDay(dueDate);
  const d2 = startOfDay(returnDate);
  const timeDiff = Math.round(d2.getTime() - d1.getTime());
  const diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
  return diffDays > 0 ? diffDays : 0;
}

function calcIssueDaysInclusive(fromDate: Date, toDate: Date): number {
  const d1 = startOfDay(fromDate);
  const d2 = startOfDay(toDate);
  const timeDiff = Math.round(d2.getTime() - d1.getTime());
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
}

function settingValue(setting: LibraryRow | null | undefined): number {
  return Number(setting?.value ?? 0);
}

function fineTypeIdByCode(
  fineTypes: GeneralDetail[],
  code: string,
): number | null {
  const match = fineTypes.find(
    (row) => String(row.generalDetailCode ?? "").toUpperCase() === code,
  );
  return match?.generalDetailId ? Number(match.generalDetailId) : null;
}

function asPayloadDate(value: unknown): string | undefined {
  if (value == null || value === "") return undefined;
  if (value instanceof Date) return toDateOnlyISO(value);
  return String(value);
}

export default function BookReturnFinesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useSessionContext();

  const bookIssuedetailsId = Number(
    searchParams.get("bookIssuedetailsId") ?? 0,
  );
  const rollNo = String(searchParams.get("rollNo") ?? "").trim();

  const [actionMode, setActionMode] = useState<ActionMode>("1");
  const [issueDuedate, setIssueDuedate] = useState<Date>(() => new Date());
  const [renewalToDate, setRenewalToDate] = useState<Date>(() => new Date());
  const [lostDate, setLostDate] = useState<Date>(() => new Date());
  const [delayDays, setDelayDays] = useState(0);
  const [fineAmount, setFineAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [balanceAmount, setBalanceAmount] = useState(0);
  const [paidAmount, setPaidAmount] = useState(0);
  const [receiptNo, setReceiptNo] = useState("");
  const [saving, setSaving] = useState(false);
  const [graceReady, setGraceReady] = useState(false);

  const {
    data: issueRow,
    isLoading: loadingIssue,
    error: issueError,
  } = useQuery({
    queryKey: ["Library", "bookIssueDetail", bookIssuedetailsId],
    queryFn: () => getBookIssueDetailById(bookIssuedetailsId),
    enabled: bookIssuedetailsId > 0,
  });

  const { data: graceSetting } = useQuery({
    queryKey: ["Library", "bookReturnGraceDays"],
    queryFn: () => getLibrarySettingByCode("BOOKRETGRACEDAY"),
  });

  const { data: fineTypes = [] } = useQuery({
    queryKey: ["Library", "libFineTypes"],
    queryFn: listLibFineTypes,
  });

  const graceDays = settingValue(graceSetting);

  const applyDelayFine = useCallback(async (chargeableDays: number) => {
    if (chargeableDays <= 0) {
      setFineAmount(0);
      setBalanceAmount(0);
      setPaidAmount(0);
      return;
    }
    try {
      const rateSetting = await getLibrarySettingByCode("BOOKRETDAY");
      const rate = settingValue(rateSetting);
      const amount = chargeableDays * rate;
      setFineAmount(amount);
      setBalanceAmount(amount);
      setPaidAmount(amount);
    } catch (e) {
      toastError(e, "Failed to load fine rate");
      setFineAmount(0);
      setBalanceAmount(0);
      setPaidAmount(0);
    }
  }, []);

  const calDays = useCallback(
    (returnDate: Date) => {
      if (!issueRow?.issueTodate) {
        setDelayDays(0);
        setFineAmount(0);
        setBalanceAmount(0);
        setPaidAmount(0);
        return;
      }
      const dueDate = new Date(String(issueRow.issueTodate));
      const nextDelay = calcDelayDays(dueDate, returnDate);
      setDelayDays(nextDelay);
      if (nextDelay > graceDays) {
        void applyDelayFine(nextDelay - graceDays);
      } else {
        setFineAmount(0);
        setBalanceAmount(0);
        setPaidAmount(0);
      }
    },
    [applyDelayFine, graceDays, issueRow?.issueTodate],
  );

  const resetReturnMode = useCallback(() => {
    setFineAmount(0);
    setBalanceAmount(0);
    setPaidAmount(0);
    setDiscountAmount(0);
    setReceiptNo("");
    const today = new Date();
    setIssueDuedate(today);
    calDays(today);
  }, [calDays]);

  const resetRenewalMode = useCallback(() => {
    setFineAmount(0);
    setBalanceAmount(0);
    setPaidAmount(0);
    setDiscountAmount(0);
    setReceiptNo("");
    const today = new Date();
    setRenewalToDate(today);
    calDays(today);
  }, [calDays]);

  const resetBookLostMode = useCallback(() => {
    const detail = (issueRow?.bookDetail ?? {}) as LibraryRow;
    const amount = Number(detail.bookAmount ?? 0);
    setFineAmount(amount);
    setBalanceAmount(amount);
    setPaidAmount(amount);
    setDiscountAmount(0);
    setReceiptNo("");
    setLostDate(new Date());
  }, [issueRow?.bookDetail]);

  useEffect(() => {
    if (!graceSetting || !issueRow || graceReady) return;
    setGraceReady(true);
    resetReturnMode();
  }, [graceReady, graceSetting, issueRow, resetReturnMode]);

  useEffect(() => {
    if (issueError) toastError(issueError, "Failed to load book issue details");
  }, [issueError]);

  function handleDiscountChange(value: string) {
    const discount = Number(value);
    const safeDiscount = Number.isFinite(discount) ? discount : 0;
    setDiscountAmount(safeDiscount);
    const nextBalance = Math.max(fineAmount - safeDiscount, 0);
    setBalanceAmount(nextBalance);
    setPaidAmount(nextBalance);
  }

  function handleActionChange(mode: ActionMode) {
    setActionMode(mode);
    if (mode === "1") resetReturnMode();
    else if (mode === "2") resetRenewalMode();
    else resetBookLostMode();
  }

  async function handleSave() {
    if (!issueRow?.bookIssuedetailsId) return;
    setSaving(true);
    try {
      const payload: BookReturnUpdatePayload = {
        ...issueRow,
        bookIssuedetailsId: Number(issueRow.bookIssuedetailsId),
        isreturned: true,
        isrenewaled: false,
        fineAmount,
        discountAmount,
        paidAmount,
        balanceAmount,
        receiptNo,
        lostDate: null,
        fineTypeId: null,
      };

      if (actionMode === "1") {
        payload.lostDate = null;
        payload.isrenewaled = false;
        payload.isreturned = true;
        payload.issueFromdate =
          asPayloadDate(issueRow.issueFromdate) ?? toDateOnlyISO(new Date());
        payload.issueTodate = asPayloadDate(issueRow.issueTodate) ?? null;
        payload.issueDuedate = toDateOnlyISO(issueDuedate);
        payload.issuedDays = Number(issueRow.issuedDays ?? 0);
        payload.fineTypeId =
          delayDays > 0 ? fineTypeIdByCode(fineTypes, "DELAY") : null;
      } else if (actionMode === "2") {
        payload.issueDuedate = null;
        payload.isrenewaled = true;
        payload.isreturned = false;
        payload.lostDate = null;
        payload.issueFromdate = toDateOnlyISO(new Date());
        payload.issueTodate = toDateOnlyISO(renewalToDate);
        payload.issuedDays = calcIssueDaysInclusive(new Date(), renewalToDate);
        payload.fineTypeId =
          delayDays > 0 ? fineTypeIdByCode(fineTypes, "DELAY") : null;
      } else {
        payload.issueDuedate = null;
        payload.isrenewaled = false;
        payload.isreturned = false;
        payload.lostDate = toDateOnlyISO(lostDate);
        payload.fineTypeId = fineTypeIdByCode(fineTypes, "BOOKLOST");
      }

      const remainingBalance = Math.max(
        Number(payload.balanceAmount ?? 0) - Number(payload.paidAmount ?? 0),
        0,
      );
      payload.balanceAmount = remainingBalance;
      payload.fineCollectedAmount = payload.paidAmount;
      payload.fineCollectedDate = new Date();
      payload.fineCollectedbyEmpId = Number(user?.employeeId ?? 0);

      await updateBookIssueDetails([payload]);
      toastSuccess("Book return saved successfully");

      if (remainingBalance > 0) {
        await createLibFineCollection(payload);
      }

      router.push(
        rollNo
          ? `/library/bookReturn?rollNo=${encodeURIComponent(rollNo)}`
          : "/library/bookReturn",
      );
    } catch (e) {
      toastError(e, "Failed to save book return");
    } finally {
      setSaving(false);
    }
  }

  const detail = (issueRow?.bookDetail ?? {}) as LibraryRow;
  const showPayFine = balanceAmount > 0;

  const bookInfo = useMemo(
    () => [
      {
        label: "Book",
        value: String(detail.bookTitle ?? issueRow?.bookTitle ?? "—"),
      },
      { label: "Library", value: String(issueRow?.libraryName ?? "—") },
      {
        label: "Issue Date",
        value: formatDisplayDate(issueRow?.issueFromdate),
      },
      { label: "Due Date", value: formatDisplayDate(issueRow?.issueTodate) },
      { label: "Book Grace Days", value: String(graceDays) },
    ],
    [detail.bookTitle, graceDays, issueRow],
  );

  if (!bookIssuedetailsId) {
    return (
      <PageContainer>
        <PageHeader title="Book Returning" />
        <p className="text-sm text-muted-foreground">
          Missing book issue id. Open this page from Book Return.
        </p>
      </PageContainer>
    );
  }

  return (
    <PageContainer className="space-y-4">
      <PageHeader title="Book Returning" />

      <BookIssueCollapsible
        title="Return Book"
        icon={<Book className="h-3.5 w-3.5" />}
        defaultOpen
        contentClassName="p-3"
      >
        {loadingIssue ? (
          <p className="text-sm text-muted-foreground">Loading book details…</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {bookInfo.map((item) => (
              <div key={item.label} className="text-[13px]">
                <span className="text-muted-foreground">{item.label} : </span>
                <span className="font-medium text-blue-600">{item.value}</span>
              </div>
            ))}
          </div>
        )}
      </BookIssueCollapsible>

      <div className="rounded-md border border-border bg-background p-4">
        <RadioGroup
          value={actionMode}
          onValueChange={(value) => handleActionChange(value as ActionMode)}
          className="flex flex-wrap gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="1" id="return-mode" />
            <Label htmlFor="return-mode">Return</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="2" id="renewal-mode" />
            <Label htmlFor="renewal-mode">Renewal</Label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="3" id="lost-mode" />
            <Label htmlFor="lost-mode">Book Lost</Label>
          </div>
        </RadioGroup>

        <div className="mt-4 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {actionMode === "1" ? (
              <>
                <div className="space-y-2">
                  <Label className="text-[13px]">Date Of Return</Label>
                  <DatePicker
                    value={issueDuedate}
                    onChange={(date) => {
                      if (!date) return;
                      setIssueDuedate(date);
                      calDays(date);
                    }}
                    placeholder="Date Of Return"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px]">Delay Days</Label>
                  <Input className="h-9" value={delayDays} readOnly disabled />
                </div>
              </>
            ) : null}

            {actionMode === "2" ? (
              <>
                <div className="space-y-2">
                  <Label className="text-[13px]">Renewal To</Label>
                  <DatePicker
                    value={renewalToDate}
                    onChange={(date) => {
                      if (!date) return;
                      setRenewalToDate(date);
                    }}
                    placeholder="Renewal To"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[13px]">Delay Days</Label>
                  <Input className="h-9" value={delayDays} readOnly disabled />
                </div>
              </>
            ) : null}

            {actionMode === "3" ? (
              <div className="space-y-2">
                <Label className="text-[13px]">Lost Date</Label>
                <DatePicker
                  value={lostDate}
                  onChange={(date) => {
                    if (!date) return;
                    setLostDate(date);
                  }}
                  placeholder="Lost Date"
                />
              </div>
            ) : null}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label className="text-[13px]">
                {actionMode === "3" ? "MRP" : "Fine"}
              </Label>
              <Input
                className="h-9"
                type="number"
                value={fineAmount}
                onChange={(e) => {
                  const amount = Number(e.target.value);
                  if (!Number.isFinite(amount)) return;
                  setFineAmount(amount);
                  setBalanceAmount(amount - discountAmount);
                  setPaidAmount(amount - discountAmount);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Discount</Label>
              <Input
                className="h-9"
                type="number"
                value={discountAmount}
                onChange={(e) => handleDiscountChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[13px]">Due Amount</Label>
              <Input
                className="h-9"
                type="number"
                value={balanceAmount}
                readOnly
              />
            </div>
          </div>
        </div>

        {showPayFine ? (
          <BookIssueCollapsible
            title="Pay Fine"
            icon={<Book className="h-3.5 w-3.5" />}
            defaultOpen
            className="mt-4"
            contentClassName="p-3"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-[13px]">Pay Amount</Label>
                <Input
                  className="h-9"
                  type="number"
                  value={paidAmount}
                  onChange={(e) => {
                    const amount = Number(e.target.value);
                    if (!Number.isFinite(amount)) return;
                    setPaidAmount(amount);
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-[13px]">Fine Receipt</Label>
                <Input
                  className="h-9"
                  value={receiptNo}
                  placeholder="Fine Receipt"
                  onChange={(e) => setReceiptNo(e.target.value)}
                />
              </div>
            </div>
          </BookIssueCollapsible>
        ) : null}

        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || loadingIssue || !issueRow}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() =>
              router.push(
                rollNo
                  ? `/library/bookReturn?rollNo=${encodeURIComponent(rollNo)}`
                  : "/library/bookReturn",
              )
            }
          >
            Back
          </Button>
        </div>
      </div>
    </PageContainer>
  );
}
