import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  isChiefEvaluatorRole,
  isEvaluatorPortalRole,
  isPureQuestionPaperSetter,
} from "@/config/constants/app";
import { springGetUserDetails } from "@/integrations/spring-api";
import { EvaluatorPortal } from "./_components/EvaluatorPortal";

/**
 * Evaluator portal — the ExamDigit evaluator vertical ported into CollegeERP.
 * Access is gated server-side to evaluator/moderator accounts; everyone else is sent
 * to their normal dashboard.
 */
export default async function EvaluatorPage() {
  const session = await getSession();
  const user = session.user;
  if (!user) redirect("/login");

  // Prefer authorization DTO userRoles — QPS often only appears there.
  const dto = session.jwt
    ? await springGetUserDetails(session.jwt).catch(() => null)
    : null;
  const userRoles = dto?.userRoles ?? null;
  const userRole = dto?.userRole ?? user.userRole;
  const roleName = dto?.roleName ?? user.roleName;

  if (isPureQuestionPaperSetter(userRole, roleName, userRoles)) {
    redirect("/question-paper-setter");
  }
  if (!isEvaluatorPortalRole(userRole, roleName, userRoles)) {
    redirect(user.defaultDashboardPath || "/dashboard");
  }

  let isChiefEvaluator = user.isChiefEvaluator;
  if (dto) {
    isChiefEvaluator = isChiefEvaluatorRole(
      dto.userRole,
      dto.roleName,
      dto.userRoles,
    );
  }

  return <EvaluatorPortal isChiefEvaluator={isChiefEvaluator} />;
}
