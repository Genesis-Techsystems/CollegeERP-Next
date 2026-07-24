"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/layout";
import { StatusBadge } from "@/common/components/data-display";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listTests, updateTest } from "@/services";
import type { Assessment } from "@/types/question-bank";
import QuestionsListDrawer from "../question-bank/QuestionsListDrawer";
import TestModal from "./TestModal";

/** Angular CONSTANTS.dateFormate = 'd MMM, y' */
function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  const day = d.getDate();
  const month = d.toLocaleDateString("en-GB", { month: "short" });
  const year = d.getFullYear();
  return `${day} ${month}, ${year}`;
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<Assessment>,
  assessment: {
    field: "assessmentName",
    headerName: "Assessment",
    flex: 1.2,
    minWidth: 200,
  } as ColDef<Assessment>,
  type: { headerName: "Test Type", width: 150, flex: 0 } as ColDef<Assessment>,
  created: {
    field: "createdDt",
    headerName: "Created On",
    width: 130,
    flex: 0,
  } as ColDef<Assessment>,
  status: {
    field: "isActive",
    headerName: "Status",
    width: 100,
    flex: 0,
  } as ColDef<Assessment>,
  actions: { headerName: "Actions", width: 280, flex: 0 } as ColDef<Assessment>,
};

function typeRenderer(p: ICellRendererParams<Assessment>) {
  if (p.data?.isCertification) return <span>For Certification</span>;
  if (p.data?.isForPractice) return <span>For Practice</span>;
  if (p.data?.isForQuestionbank) return <span>For Question Bank</span>;
  return <span>—</span>;
}

function statusRenderer(p: ICellRendererParams<Assessment>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeAssessmentRenderer(
  onQuestionList: (row: Assessment) => void,
  onEdit: (row: Assessment) => void,
) {
  return (p: ICellRendererParams<Assessment>) => {
    const row = p.data;
    if (!row) return null;
    const count = row.assessmentQuestionDTOs?.length ?? 0;
    const showQuestion = row.collegeCode !== null;
    const showEdit = row.academicYear !== null;
    return (
      <div className="leading-tight py-1">
        <div className="text-sm font-semibold">{row.assessmentName}</div>
        <div className="mt-0.5 text-xs text-blue-600">
          {/* Angular always renders "Question (n) | Edit" with ngIf on each action */}
          {showQuestion && (
            <button
              type="button"
              className="hover:underline"
              onClick={() => onQuestionList(row)}
            >
              Question ({count})
            </button>
          )}
          {showQuestion && (
            <span className="mx-1 text-muted-foreground">|</span>
          )}
          {showEdit && (
            <button
              type="button"
              className="hover:underline"
              onClick={() => onEdit(row)}
            >
              Edit
            </button>
          )}
        </div>
      </div>
    );
  };
}

function makeActionsRenderer(
  onSettings: (row: Assessment) => void,
  onManage: (row: Assessment) => void,
  onPublish: (row: Assessment) => void,
) {
  return (p: ICellRendererParams<Assessment>) => (
    <div className="flex flex-col gap-1.5 py-1">
      <div className="flex flex-wrap gap-1.5">
        <Button
          size="sm"
          className="h-8"
          onClick={() => p.data && onSettings(p.data)}
        >
          Test Settings
        </Button>
        <Button
          size="sm"
          className="h-8"
          onClick={() => p.data && onManage(p.data)}
        >
          Manage Question
        </Button>
      </div>
      <div>
        <Button
          size="sm"
          className="h-8"
          onClick={() => p.data && onPublish(p.data)}
        >
          Publish Test
        </Button>
      </div>
    </div>
  );
}

export default function TestPage() {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Assessment | null>(null);
  const [drawerTest, setDrawerTest] = useState<Assessment | null>(null);

  // Angular: listAllDetails — no role/user filter
  const {
    data: tests,
    isLoading: loading,
    invalidate,
  } = useCrudList({
    queryKey: [...QK.questionBanks.list(), "tests"],
    queryFn: () => listTests(),
  });

  const openEdit = (row: Assessment) => {
    setEditingTest(row);
    setModalOpen(true);
  };

  const openQuestionList = (row: Assessment) => {
    if (row.assessmentQuestionDTOs == null) return;
    setDrawerTest(row);
  };

  const handlePublish = async (test: Assessment) => {
    try {
      // Angular publish(): set isSystemcorrection=true then update(full item)
      await updateTest({ ...test, isSystemcorrection: true } as Record<
        string,
        unknown
      >);
      toast.success("Test published");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to publish");
    }
  };

  const columnDefs = useMemo<ColDef<Assessment>[]>(
    () => [
      COL_DEFS.siNo,
      {
        ...COL_DEFS.assessment,
        cellRenderer: makeAssessmentRenderer(openQuestionList, openEdit),
        autoHeight: true,
      },
      { ...COL_DEFS.type, cellRenderer: typeRenderer },
      { ...COL_DEFS.created, valueFormatter: (p) => formatDate(p.value) },
      { ...COL_DEFS.status, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer(
          (test) =>
            router.push(
              `/assessments/test/test-settings?assessmentId=${test.assessmentId}&assessmentName=${encodeURIComponent(test.assessmentName)}`,
            ),
          (test) =>
            router.push(
              `/assessments/test/manage-question?assessmentId=${test.assessmentId}`,
            ),
          handlePublish,
        ),
        autoHeight: true,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [router],
  );

  return (
    <ListPage
      title="Test List"
      rowData={tests}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          onClick={() => {
            setEditingTest(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="mr-1 h-4 w-4" />
          Create Test
        </Button>
      }
    >
      <TestModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTest(null);
        }}
        test={editingTest}
        onSaved={invalidate}
      />

      <QuestionsListDrawer
        bank={drawerTest}
        onClose={() => setDrawerTest(null)}
        onDeleted={invalidate}
        onEditQuestion={(test, aqId) => {
          router.push(
            `/assessments/question-bank/add-question?assessmentId=${test.assessmentId}&assessmentQuestionId=${aqId}&permission=Edit&page=assessments/test`,
          );
        }}
      />
    </ListPage>
  );
}
