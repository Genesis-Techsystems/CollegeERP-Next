"use client";

import { useRef } from "react";
import { DEFAULT_STUDENT_PHOTO } from "./edit-student-utils";

export interface PhotoFieldProps {
  src: string;
  onFile: (file: File) => void;
  className?: string;
  label?: string;
  /** Placeholder when `src` is empty or the image fails to load. */
  fallback?: string;
}

export function PhotoField({
  src,
  onFile,
  className = "h-24 w-24",
  label,
  fallback = DEFAULT_STUDENT_PHOTO,
}: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const fallbackName = fallback.split("/").pop() ?? "default_Student.png";

  return (
    <div className="flex flex-col items-center gap-1">
      {label ? (
        <span className="text-[10px] text-muted-foreground">{label}</span>
      ) : null}
      <button
        type="button"
        className="rounded border border-sky-200 bg-white p-0.5 shadow-sm"
        onClick={() => inputRef.current?.click()}
      >
        <img
          src={src || fallback}
          alt=""
          className={`${className} cursor-pointer rounded object-cover`}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.includes(fallbackName)) img.src = fallback;
          }}
        />
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
        }}
      />
    </div>
  );
}
