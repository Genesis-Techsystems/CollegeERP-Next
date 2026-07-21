'use client'

import { GraduationCap } from "lucide-react";

export function ExamLogo({ size = 40 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm"
      style={{ width: size, height: size }}
    >
      <GraduationCap style={{ width: size * 0.55, height: size * 0.55 }} />
    </div>
  );
}