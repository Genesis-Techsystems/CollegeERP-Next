"use client";

// Evaluator portal shell — ported from the standalone ExamDigit dashboard route.
// The demo role picker + nested sidebar are dropped: CollegeERP's protected
// layout already provides the app shell, and access is gated to evaluator
// accounts server-side (see ../page.tsx). This just switches between the three
// evaluator views: subjects dashboard → answer scripts → marking workbench.

import { useEffect, useState, Suspense } from "react";
import { createPortal } from "react-dom";
import { PageContainer, PageHeader } from "@/components/layout";
import { EvaluatorDashboard } from "./evaluator-dashboard";
import { AnswerScriptsList, type ScriptRow } from "./answer-scripts-list";
import { EvaluationWorkbench } from "./evaluation-workbench";
import type { SubjectCard } from "./subject-cards";

export type RoleTab = "evaluator" | "moderator";

/** Browser Fullscreen API (F11-style) — must run in a user-gesture stack when possible. */
async function enterBrowserFullscreen(el?: HTMLElement | null) {
  if (typeof document === "undefined") return;
  if (document.fullscreenElement) return;
  const target = el ?? document.documentElement;
  const req =
    target.requestFullscreen?.bind(target) ??
    (
      target as HTMLElement & {
        webkitRequestFullscreen?: () => Promise<void> | void;
      }
    ).webkitRequestFullscreen?.bind(target);
  if (!req) return;
  try {
    await req();
  } catch {
    /* Autoplay/gesture policies may block — CSS full-viewport still applies. */
  }
}

async function exitBrowserFullscreen() {
  if (typeof document === "undefined") return;
  if (!document.fullscreenElement) return;
  const exit =
    document.exitFullscreen?.bind(document) ??
    (
      document as Document & {
        webkitExitFullscreen?: () => Promise<void> | void;
      }
    ).webkitExitFullscreen?.bind(document);
  if (!exit) return;
  try {
    await exit();
  } catch {
    /* ignore */
  }
}

export function EvaluatorPortal({
  pageTitle,
  pageSubtitle,
}: {
  /** When set, shown above the subjects dashboard (e.g. "My Subjects"). */
  pageTitle?: string;
  pageSubtitle?: string;
} = {}) {
  const [openScript, setOpenScript] = useState<ScriptRow | null>(null);
  const [openSubject, setOpenSubject] = useState<SubjectCard | null>(null);
  /** Remember Evaluator/Moderator tab so Back from answer papers restores it. */
  const [roleTab, setRoleTab] = useState<RoleTab>("evaluator");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  function openSubjectFromDashboard(s: SubjectCard) {
    setRoleTab(s.isValidator ? "moderator" : "evaluator");
    setOpenSubject(s);
  }

  function openEvaluationScript(s: ScriptRow) {
    setOpenScript(s);
    // Same click that opens the paper — browsers allow Fullscreen API here (like F11).
    void enterBrowserFullscreen();
  }

  function closeEvaluationScript() {
    void exitBrowserFullscreen();
    setOpenScript(null);
  }

  // Full-screen marking workbench when a script is opened.
  if (openScript) {
    const workbench = (
      <EvaluationWorkbench
        key={`${openScript.examEvaluationAssignmentId}-${openScript.studentAnswerPaperId}`}
        scriptId={openScript.id}
        studentAnswerPaperId={openScript.studentAnswerPaperId}
        examEvaluationAssignmentId={openScript.examEvaluationAssignmentId}
        subjectName={openSubject?.subjectName ?? openSubject?.name}
        profileId={openSubject?.examEvaluatorProfileId}
        profileDetId={openSubject?.examEvaluatorProfileDetId}
        isValidator={!!openSubject?.isValidator}
        prevEvaluatorAnswerPath={openScript.prevEvaluatorAnswerPath}
        // Back to answer-scripts list (same origin page — My Subjects or /evaluator).
        onBack={closeEvaluationScript}
        onFinishNext={(next) => {
          // Stay in browser fullscreen for the next paper.
          setOpenScript(next);
          void enterBrowserFullscreen();
        }}
      />
    );
    return mounted ? createPortal(workbench, document.body) : null;
  }

  // Answer-scripts list for a chosen subject — Back returns to this page's dashboard.
  if (openSubject) {
    return (
      <PageContainer>
        <AnswerScriptsList
          subject={openSubject}
          subjectName={openSubject.subjectName ?? openSubject.name}
          profileId={openSubject.examEvaluatorProfileId ?? undefined}
          profileDetId={openSubject.examEvaluatorProfileDetId ?? undefined}
          isValidator={!!openSubject.isValidator}
          onOpen={openEvaluationScript}
          onBack={() => setOpenSubject(null)}
        />
      </PageContainer>
    );
  }

  // Default: evaluator subjects dashboard (same design for /evaluator and My Subjects).
  return (
    <PageContainer className="space-y-6">
      {pageTitle ? (
        <PageHeader title={pageTitle} subtitle={pageSubtitle} />
      ) : null}
      <Suspense fallback={null}>
        <EvaluatorDashboard
          onOpenSubject={openSubjectFromDashboard}
          roleTab={roleTab}
          onRoleTabChange={setRoleTab}
        />
      </Suspense>
    </PageContainer>
  );
}
