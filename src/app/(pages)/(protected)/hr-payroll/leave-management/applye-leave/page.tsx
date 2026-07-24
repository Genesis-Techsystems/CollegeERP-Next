"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Angular menu uses `/staff-faculty-leaves/apply-leave` (HR slug was a typo: applye-leave). */
export default function Page() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/staff-faculty-leaves/apply-leave");
  }, [router]);
  return null;
}
