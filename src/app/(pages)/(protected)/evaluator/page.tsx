import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import {
  isChiefEvaluatorRole,
  isEvaluatorPortalRole,
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
  if (!isEvaluatorPortalRole(user.userRole, user.roleName))
    redirect("/dashboard");

  let isChiefEvaluator = user.isChiefEvaluator;
  if (!isChiefEvaluator && session.jwt) {
    const dto = await springGetUserDetails(session.jwt).catch(() => null);
    if (dto) {
      isChiefEvaluator = isChiefEvaluatorRole(
        dto.userRole,
        dto.roleName,
        dto.userRoles,
      );
    }
  }

  return <EvaluatorPortal isChiefEvaluator={isChiefEvaluator} />;
}
