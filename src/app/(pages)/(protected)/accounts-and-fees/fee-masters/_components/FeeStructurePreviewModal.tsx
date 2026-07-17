"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { CollegeFeeStructureCreatePayload } from "@/types/fee-structure";

type PreviewPayload = CollegeFeeStructureCreatePayload & {
  feeStructureId?: number;
};

type ParticularRow = {
  categoryName?: string;
  particularName?: string;
  particularsName?: string;
  feeLabel?: string;
  feeAmount?: number;
  lateralFeeAmount?: number;
  isActive?: boolean;
};

type CourseGroupRow = {
  groupCode?: string;
};

/** Angular `ViewPreviewComponent` — confirm before POST to `feestructures`. */
export function FeeStructurePreviewModal({
  open,
  onClose,
  onConfirm,
  payload,
  saving,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  payload: PreviewPayload | null;
  saving?: boolean;
}>) {
  const particulars = (payload?.feeStructureParticularDTOs ?? []).filter(
    (p) => p.isActive !== false,
  ) as ParticularRow[];
  const groups = (payload?.feeStructureCourseyrDTOs ?? []) as CourseGroupRow[];

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>View Fee Structure</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <span className="text-muted-foreground">Fee Structure</span>
            <span className="font-medium text-blue-700">
              {payload?.classGroupName ?? "—"}
            </span>
          </div>
          <div className="grid grid-cols-[7rem_1fr] gap-2">
            <span className="text-muted-foreground">College</span>
            <span>
              {payload?.college ?? "—"}
              {payload?.course ? ` / ${payload.course}` : ""}
              {payload?.batch ? ` / ${payload.batch}` : ""}
              {payload?.academicYear ? ` / ${payload.academicYear}` : ""}
            </span>
          </div>
          {groups.length > 0 ? (
            <div className="grid grid-cols-[7rem_1fr] gap-2">
              <span className="text-muted-foreground">Course Years</span>
              <div className="space-y-1">
                {payload?.course ? (
                  <p className="font-medium text-blue-700">{payload.course}</p>
                ) : null}
                {groups.map((item, index) => (
                  <p key={`${item.groupCode}-${index}`}>
                    {item.groupCode ?? "—"}
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
                <th className="px-3 py-2 text-left font-medium">Course Year</th>
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
                    colSpan={5}
                    className="px-3 py-6 text-center text-muted-foreground"
                  >
                    No particulars available
                  </td>
                </tr>
              ) : (
                particulars.map((particular, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-3 py-2">{index + 1}</td>
                    <td className="px-3 py-2">{particular.feeLabel ?? "—"}</td>
                    <td className="px-3 py-2">
                      {particular.categoryName ?? "—"} -{" "}
                      {particular.particularName ??
                        particular.particularsName ??
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
          <Button type="button" onClick={onConfirm} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
