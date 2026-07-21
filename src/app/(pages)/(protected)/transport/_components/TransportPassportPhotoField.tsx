"use client";

import type { RefObject } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  TRANSPORT_FIELD_LABEL_CLASS,
  TRANSPORT_INPUT_CLASS,
} from "../_lib/modal-styles";
import {
  TRANSPORT_PHOTO_ACCEPT,
  TRANSPORT_PHOTO_INVALID_MESSAGE,
  isAllowedTransportPhotoFile,
} from "../_lib/transport-photo";

interface TransportPassportPhotoFieldProps {
  fileRef: RefObject<HTMLInputElement | null>;
  error?: string | null;
  onErrorChange: (message: string | null) => void;
  disabled?: boolean;
}

/** Organization-style file input for passport photo (.png / .jpg / .jpeg). */
export function TransportPassportPhotoField({
  fileRef,
  error,
  onErrorChange,
  disabled = false,
}: Readonly<TransportPassportPhotoFieldProps>) {
  return (
    <div className="min-w-0 space-y-1">
      <Label className={TRANSPORT_FIELD_LABEL_CLASS}>
        Passport Photo (.png, .jpg, .jpeg)
      </Label>
      <Input
        type="file"
        accept={TRANSPORT_PHOTO_ACCEPT}
        ref={fileRef}
        disabled={disabled}
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (!selected) {
            onErrorChange(null);
            return;
          }
          if (!isAllowedTransportPhotoFile(selected)) {
            onErrorChange(TRANSPORT_PHOTO_INVALID_MESSAGE);
            e.target.value = "";
            return;
          }
          onErrorChange(null);
        }}
        className={`${TRANSPORT_INPUT_CLASS} cursor-pointer py-1.5 file:mr-2 file:rounded-md file:border-0 file:bg-[#eef2f7] file:px-2.5 file:py-1 file:text-[11px] file:font-semibold file:text-slate-600`}
      />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
