import { redirect } from "next/navigation";

/** Angular `leave-approvals` → Leave Requests page (`leave-applications`). */
export default function Page() {
  redirect("/principal-my-approvals/leave-applications");
}
