"use client";

import { format, isValid, parseISO } from "date-fns";
import { ClipboardList } from "lucide-react";
import type { ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DATE_FORMATS } from "@/config/constants";
import { tConvert } from "@/services";

type AnyRow = Record<string, unknown>;

function txt(row: AnyRow | null | undefined, keys: string[]): string {
  if (!row) return "";
  for (const key of keys) {
    const v = row[key];
    if (v != null && String(v).trim() !== "") return String(v).trim();
  }
  return "";
}

function displayOrDash(value: string): string {
  return value.trim() ? value : " - ";
}

function formatDisplayDate(value: unknown): string {
  if (value == null || value === "") return "";
  const s = String(value).trim();
  const iso = parseISO(s);
  const d = isValid(iso) ? iso : new Date(s);
  if (!isValid(d)) return "";
  return format(d, DATE_FORMATS.DISPLAY);
}

/** Angular view-activity: 25% label / 75% blue value rows. */
function DetailRow({
  label,
  value,
}: Readonly<{ label: string; value: ReactNode }>) {
  return (
    <div className="grid grid-cols-1 gap-1 px-2 py-1 sm:grid-cols-4">
      <p className="m-0 text-[13px] font-medium text-foreground">{label} :</p>
      <div className="m-0 text-[13px] font-medium sm:col-span-3">
        <span className="text-[#0d29ff]">{value}</span>
      </div>
    </div>
  );
}

type ViewSpecialActivityModalProps = {
  open: boolean;
  row: AnyRow | null;
  onClose: () => void;
};

export function ViewSpecialActivityModal({
  open,
  row,
  onClose,
}: ViewSpecialActivityModalProps) {
  const attendees = Array.isArray(row?.spclActivityAttendeedto)
    ? (row!.spclActivityAttendeedto as AnyRow[])
    : [];

  const from = tConvert(row?.fromTime);
  const to = tConvert(row?.toTime);
  const timing = from || to ? `${from} - ${to}` : "";

  const fromDate = formatDisplayDate(row?.fromDate);
  const toDate = formatDisplayDate(row?.toDate);
  const dateRange =
    fromDate || toDate ? `${fromDate}${toDate ? ` - ${toDate}` : ""}` : " - ";

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        closeOnOutsideClick={false}
        hideClose
        hasDescription
        className="flex max-h-[90vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
      >
        <DialogDescription className="sr-only">
          View special activity details
        </DialogDescription>

        <div className="border-b border-border px-4 py-2.5">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 shrink-0 text-foreground" />
            <DialogTitle className="m-0 p-0 text-[15px] font-medium leading-none text-foreground">
              View Activity
            </DialogTitle>
          </div>
        </div>

        {row ? (
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <DetailRow
              label="College"
              value={displayOrDash(txt(row, ["collegeCode"]))}
            />
            <DetailRow
              label="Activity Type"
              value={displayOrDash(txt(row, ["spclactityCatdetDisplayName"]))}
            />
            <DetailRow
              label="Special Activity"
              value={displayOrDash(txt(row, ["specialActivityName"]))}
            />
            <DetailRow
              label="Description"
              value={displayOrDash(txt(row, ["specialActivityDescription"]))}
            />
            <DetailRow
              label="Faculty"
              value={
                <>
                  {txt(row, ["firstName"])}{" "}
                  {txt(row, ["empNumber"]) ? (
                    <span className="font-semibold">
                      ({txt(row, ["empNumber"])})
                    </span>
                  ) : null}
                </>
              }
            />
            <DetailRow
              label="Subject"
              value={
                <>
                  {txt(row, ["subjectName"])}{" "}
                  {txt(row, ["subjectCode"]) ? (
                    <span className="font-semibold">
                      ({txt(row, ["subjectCode"])})
                    </span>
                  ) : null}
                </>
              }
            />
            <DetailRow label="Date" value={dateRange} />
            <DetailRow label="Timing" value={timing ? timing : " - "} />
            <DetailRow
              label="Facilitator Company Name"
              value={displayOrDash(txt(row, ["facilitatorCompanyName"]))}
            />
            <DetailRow
              label="Facilitator Details"
              value={displayOrDash(txt(row, ["facilitatorDetails"]))}
            />
            <DetailRow
              label="Facilitator Names"
              value={displayOrDash(txt(row, ["facilitatorNames"]))}
            />
            <DetailRow
              label="Closing Comments"
              value={displayOrDash(txt(row, ["closingComments"]))}
            />
            <div className="grid grid-cols-1 gap-1 px-2 py-1 sm:grid-cols-4">
              <p className="m-0 text-[13px] font-medium text-foreground">
                For Course Years :
              </p>
              <div className="space-y-0.5 sm:col-span-3">
                {attendees.length === 0 ? (
                  <p className="m-0 text-[13px] font-medium text-[#0d29ff]">
                    {" "}
                    -{" "}
                  </p>
                ) : (
                  attendees.map((item, i) => (
                    <p
                      key={`${txt(item, ["groupSectionId"])}-${i}`}
                      className="m-0 text-[13px] font-medium text-[#0d29ff]"
                    >
                      {txt(item, ["collegeCode"])} /{" "}
                      {txt(item, ["academicYear"])} / {txt(item, ["groupCode"])}{" "}
                      / {txt(item, ["courseYearCode"])} /{" "}
                      {txt(item, ["section"])}
                    </p>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : null}

        <DialogFooter className="border-t border-border px-4 py-3 sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
