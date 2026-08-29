import { redirect } from "next/navigation";
import {
  isPureQuestionPaperSetter,
} from "@/config/constants/app";
import { getSession } from "@/lib/session";
import { springGetUserDetails } from "@/integrations/spring-api";
import { QuestionPaperSetterDashboard } from "./_components/QuestionPaperSetterDashboard";

/**
 * Question Paper Setter home — Angular sends these users to main-dashboard,
 * not the evaluator subjects portal (`/evaluator`).
 */
export default async function QuestionPaperSetterPage() {
  const session = await getSession();
  const user = session.user;
  if (!user) redirect("/login");

  const dto = session.jwt
    ? await springGetUserDetails(session.jwt).catch(() => null)
    : null;
  const allowed =
    user.defaultDashboardPath === "/question-paper-setter" ||
    isPureQuestionPaperSetter(
      dto?.userRole ?? user.userRole,
      dto?.roleName ?? user.roleName,
      dto?.userRoles,
    );
  if (!allowed) {
    redirect(user.defaultDashboardPath || "/dashboard");
  }

  return <QuestionPaperSetterDashboard />;
}
