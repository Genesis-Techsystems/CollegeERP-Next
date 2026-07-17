"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CollegeFeeStructureRow } from "@/types/fee-structure";

type ParticularRow = {
  categoryName?: string;
  particularsName?: string;
  particularName?: string;
  feeAmount?: number;
  lateralFeeAmount?: number;
};

type CourseYearRow = {
  groupName?: string;
  courseYearName?: string;
};

function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Angular `ViewStructureComponent` — read-only particulars from list row payload. */
export function ViewFeeStructureModal({
  open,
  onClose,
  row,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  row: CollegeFeeStructureRow | null;
}>) {
  const particulars = asArray<ParticularRow>(
    row?.feeStructureParticularDTOs ?? row?.feeStructureParticulars,
  );
  const courseYears = asArray<CourseYearRow>(
    row?.feeStructureCourseyrDTOs ?? row?.feeStructureCourseYears,
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>View Fee Structure</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <span className="text-muted-foreground">Fee Structure</span>
            <span className="font-medium text-blue-700">
              {row?.classGroupName ?? "—"}
            </span>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <span className="text-muted-foreground">College</span>
            <span>
              {row?.collegeCode ?? "—"}
              {row?.academicYear ? ` / (${row.academicYear})` : ""}
            </span>
          </div>
          {courseYears.length > 0 ? (
            <div className="grid grid-cols-[7rem_1fr] gap-2">
              <span className="text-muted-foreground">Course Years</span>
              <div className="space-y-1">
                {courseYears.map((item, index) => (
                  <p key={`${item.groupName}-${item.courseYearName}-${index}`}>
                    {item.groupName ?? "—"} /{" "}
                    <span className="font-medium text-blue-700">
                      {item.courseYearName ?? "—"}
                    </span>
                  </p>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-4 overflow-x-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-3 py-2 text-left font-medium">SI.No.</th>
                <th className="px-3 py-2 text-left font-medium">Particular</th>
                <th className="px-3 py-2 text-right font-medium">Fee Amount</th>
                <th className="px-3 py-2 text-right font-medium">
                  Lateral Fee Amount
                </th>
              </tr>
            </thead>
            <tbody>
              {particulars.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No particulars available
                  </td>
                </tr>
              ) : (
                particulars.map((particular, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">
                      {particular.categoryName ?? "—"} -{" "}
                      {particular.particularsName ??
                        particular.particularName ??
                        "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {particular.feeAmount ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {particular.lateralFeeAmount ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
