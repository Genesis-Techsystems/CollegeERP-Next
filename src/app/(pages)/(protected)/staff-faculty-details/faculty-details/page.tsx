import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { isSecretaryRole } from "@/lib/role-routing";
import { FacultyDetailsPage } from "../_components/FacultyDetailsPage";

/** Angular `staff-faculty-details/faculty-details` (hod-staff-details). */
export default async function Page() {
  const session = await getSession();
  if (isSecretaryRole(session.user?.roleName)) {
    redirect("/hr-payroll/employee/employee-list");
  }

  return <FacultyDetailsPage />;
}
