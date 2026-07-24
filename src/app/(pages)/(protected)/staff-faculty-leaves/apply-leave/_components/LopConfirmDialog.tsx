"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface LopConfirmDialogProps {
  open: boolean;
  bal: number;
  lop: number;
  onClose: () => void;
}

/** Angular `LopConfirmDialogComponent` — Yes is commented out; only dismiss. */
export function LopConfirmDialog({
  open,
  bal,
  lop,
  onClose,
}: LopConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg" hasDescription>
        <DialogHeader>
          <DialogTitle>Confirmation</DialogTitle>
          <DialogDescription>
            Balance leaves ({bal}) are not sufficient, Please select LOP leave
            type for further leaves.
            {lop > 0 ? ` (LOP days: ${lop})` : ""}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            No
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
