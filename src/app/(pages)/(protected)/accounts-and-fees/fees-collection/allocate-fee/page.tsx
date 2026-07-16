import { redirect } from "next/navigation";

/** Angular folder slug → App Router path `allocate-student-fee`. */
export default function AllocateFeeRedirectPage() {
  redirect("/accounts-and-fees/fees-collection/allocate-student-fee");
}
