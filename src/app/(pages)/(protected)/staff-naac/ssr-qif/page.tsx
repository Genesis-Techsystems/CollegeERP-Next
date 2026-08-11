import { redirect } from "next/navigation";

/** Angular `staff-naac/ssr-qif` is the Co-academic marks form — same as Subject Assessment. */
export default function SsrQifAliasPage() {
  redirect("/staff-naac/staff-naac-assessment");
}
