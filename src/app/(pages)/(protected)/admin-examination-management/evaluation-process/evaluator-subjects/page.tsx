"use client";

/**
 * My Subjects (evaluator-subjects) — same dashboard design and flow as `/evaluator`:
 * subjects → answer scripts → workbench. Back always returns to this page's subjects list.
 */
import { EvaluatorPortal } from "@/app/(pages)/(protected)/evaluator/_components/EvaluatorPortal";

export default function EvaluatorSubjectsPage() {
  return (
    <EvaluatorPortal
      pageTitle="My Subjects"
      pageSubtitle="Manage your subject evaluations"
    />
  );
}
