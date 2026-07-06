"use client";

import { useRef } from "react";
import { DEFAULT_STUDENT_PHOTO } from "./edit-student-utils";

export interface PhotoFieldProps {
  src: string;
  onFile: (file: File) => void;
  className?: string;
  label?: string;
}

export function PhotoField({
  src,
  onFile,
  className = "h-24 w-24",
  label,
}: PhotoFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);

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
          src={src || DEFAULT_STUDENT_PHOTO}
          alt=""
          className={`${className} cursor-pointer rounded object-cover`}
          onError={(e) => {
            const img = e.currentTarget;
            if (!img.src.includes("default_Student.png"))
              img.src = DEFAULT_STUDENT_PHOTO;
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
