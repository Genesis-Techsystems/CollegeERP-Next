"use client";

import { Button } from "@/components/ui/button";

/** Keep the Action column wide enough for one compact Upload chip. */
export const AFFILIATED_ACTION_COL = {
  minWidth: 120,
  width: 120,
  maxWidth: 140,
  flex: 0,
  sortable: false,
  suppressSizeToFit: true,
  cellStyle: {
    display: "flex",
    alignItems: "center",
    overflow: "hidden",
    paddingTop: 0,
    paddingBottom: 0,
  },
} as const;

const UPLOAD_BTN_CLASS =
  "h-[26px] min-h-[26px] max-h-[26px] min-w-[76px] px-2 py-0 text-[12px] leading-none";

/** Compact Upload control that stays inside the AG Grid row (no overlap). */
export function AffiliatedUploadCell({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex h-full w-full items-center overflow-hidden">
      <Button
        type="button"
        size="sm"
        variant="default"
        className={UPLOAD_BTN_CLASS}
        onClick={onClick}
      >
        Upload
      </Button>
    </div>
  );
}
