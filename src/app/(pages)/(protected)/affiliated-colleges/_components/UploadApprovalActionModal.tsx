"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

type UploadApprovalActionModalProps = {
  open: boolean;
  action: "approve" | "reject";
  onClose: () => void;
  onSubmit: (comments: string) => void;
  loading?: boolean;
};

export function UploadApprovalActionModal({
  open,
  action,
  onClose,
  onSubmit,
  loading,
}: UploadApprovalActionModalProps) {
  const [comments, setComments] = useState("");

  useEffect(() => {
    if (open) setComments("");
  }, [open, action]);

  const handleClose = () => {
    setComments("");
    onClose();
  };

  const handleSubmit = () => {
    // Allow any non-empty value, including whitespace-only (Angular parity).
    if (comments.length === 0) return;
    onSubmit(comments);
  };

  const canSubmit = comments.length > 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) handleClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Confirm Your Action</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {action === "approve"
            ? "Are you sure you want to approve this? Once confirmed, all data will be permanently committed to the system with no option to reverse the action."
            : "Are you sure you want to deny this? Once confirmed, the action will be final and cannot be reversed."}
        </p>
        <div className="space-y-2">
          <Label htmlFor="approval-comments">Notes / Terms</Label>
          <textarea
            id="approval-comments"
            className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Comments"
            value={comments}
            onChange={(e) => setComments(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Close
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading || !canSubmit}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
