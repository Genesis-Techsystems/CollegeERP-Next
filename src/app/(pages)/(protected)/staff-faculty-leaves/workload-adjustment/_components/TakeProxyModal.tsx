"use client";

import { FormModal } from "@/common/components/feedback";
import { toastInfo } from "@/lib/toast";

interface TakeProxyModalProps {
  open: boolean;
  employeeId: number;
  collegeId: number;
  onClose: () => void;
  onSaved: () => void;
}

/**
 * Angular Take Proxy is a large college→section→timetable cascade dialog.
 * Placeholder shell until full cascade parity is ported; day-tab Set Proxy
 * covers the primary Faculty Leaves workflow from the Angular screenshots.
 */
export function TakeProxyModal({ open, onClose }: TakeProxyModalProps) {
  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Take Proxy"
      submitLabel="Close"
      showCancelButton={false}
      onSubmit={(e) => {
        e.preventDefault();
        toastInfo(
          "Use day tabs and Set Proxy for class-based proxy assignment. Full Take Proxy cascade is available in Angular; contact admin if needed.",
        );
        onClose();
      }}
    >
      <p className="text-sm text-muted-foreground">
        Take Proxy opens the college / course / timetable cascade to request a
        proxy slot. Prefer assigning proxies from Mon–Sat class cards via{" "}
        <strong>Set Proxy</strong> for the standard workload-adjustment flow.
      </p>
    </FormModal>
  );
}
