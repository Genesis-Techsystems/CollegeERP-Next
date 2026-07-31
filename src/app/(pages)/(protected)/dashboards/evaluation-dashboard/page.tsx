"use client";

/**
 * Evaluation Dashboard — Angular evaluation-subjects-list parity.
 * Same Evaluator / Moderator role tabs as `/evaluator` and My Subjects.
 */
import { EvaluatorPortal } from "@/app/(pages)/(protected)/evaluator/_components/EvaluatorPortal";

export default function EvaluationDashboardPage() {
  return (
    <EvaluatorPortal
      pageTitle="Evaluation Dashboard"
      pageSubtitle="Your subject assignments and evaluation progress"
    />
  );
}
