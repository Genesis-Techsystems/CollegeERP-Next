"use client";

/**
 * Angular parity: add-exam-timetables/existing-exam-timetables
 */
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

type AnyRow = Record<string, unknown>;

interface ExistingExamTimetableModalProps {
  open: boolean;
  onClose: () => void;
  rows: AnyRow[];
}

export function ExistingExamTimetableModal({
  open,
  onClose,
  rows,
}: ExistingExamTimetableModalProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent className="max-w-2xl p-0 overflow-hidden">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="text-[hsl(var(--primary))]">
            Existing Exam Timetable
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[50vh] overflow-auto px-6 py-4">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-1 text-left">SI.No</th>
                <th className="px-2 py-1 text-left">Subject</th>
                <th className="px-2 py-1 text-left">Course Group</th>
                <th className="px-2 py-1 text-left">Course Year</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={`ex-${i}`} className="border-t">
                  <td className="px-2 py-1">{i + 1}</td>
                  <td className="px-2 py-1">
                    {String(r.subjectName ?? "")}{" "}
                    {r.subjectCode ? (
                      <span>({String(r.subjectCode)})</span>
                    ) : null}
                  </td>
                  <td className="px-2 py-1">
                    {String(r.courseGroupName ?? "")}
                  </td>
                  <td className="px-2 py-1">
                    {String(r.courseYearName ?? "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter className="border-t px-6 py-3">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
