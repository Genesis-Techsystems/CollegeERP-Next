import { redirect } from "next/navigation";

/** Angular `faculty-details/leave-approvals` (my-leaves module mount). */
export default function Page() {
  redirect("/principal-my-approvals/leave-applications");
}
