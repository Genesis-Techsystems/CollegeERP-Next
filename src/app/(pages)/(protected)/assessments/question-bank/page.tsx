"use client";

import { useState, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PlusIcon, BookOpen, DownloadIcon } from "lucide-react";
import { toast } from "sonner";
import { ListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/common/components/data-display";
import { useCrudList } from "@/hooks/useCrudList";
import { useSession } from "@/hooks/useSession";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import {
  listQuestionBanks,
  importQuestionsFromExcel,
  addOrUpdateQuestion,
  buildImportedQuestionPayload,
} from "@/services";
import type { Assessment } from "@/types/question-bank";
import QuestionBankModal from "./QuestionBankModal";
import QuestionsListDrawer from "./QuestionsListDrawer";

// ─── Column shape (Angular mat-table parity) ──────────────────────────────────

/** Angular CONSTANTS.dateFormate = 'd MMM, y' → e.g. "21 Jul, 2026" */
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
  name: {
    field: "assessmentName",
    headerName: "Question Bank",
    flex: 1.2,
    minWidth: 200,
  } as ColDef<Assessment>,
  description: {
    field: "assessmentDescription",
    headerName: "Description",
    flex: 1,
    minWidth: 160,
  } as ColDef<Assessment>,
  createdDt: {
    field: "createdDt",
    headerName: "Created On",
    valueFormatter: (p) => formatDate(p.value),
    width: 130,
    flex: 0,
  } as ColDef<Assessment>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    width: 100,
    flex: 0,
  } as ColDef<Assessment>,
  addQuestions: {
    headerName: "Add Questions",
    width: 220,
    flex: 0,
  } as ColDef<Assessment>,
};

// ─── Pure renderers ───────────────────────────────────────────────────────────

function statusRenderer(p: ICellRendererParams<Assessment>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

/**
 * Angular: bank name + "Question (n) | Edit" under it.
 * Question link when collegeCode !== null; Edit when academicYear !== null
 * (`undefined !== null` is true, matching Angular).
 * questionList only opens when assessmentQuestionDTOs != null.
 */
function makeBankNameRenderer(
  onQuestionList: (bank: Assessment) => void,
  onEdit: (bank: Assessment) => void,
) {
  return (p: ICellRendererParams<Assessment>) => {
    const row = p.data;
    if (!row) return null;
    const count = row.assessmentQuestionDTOs?.length ?? 0;
    const showQuestion = row.collegeCode !== null;
    const showEdit = row.academicYear !== null;

    return (
      <div className="leading-tight py-1">
        <div className="font-semibold text-sm text-foreground">
          {row.assessmentName}
        </div>
        <div className="mt-0.5 text-xs text-blue-600">
          {showQuestion && (
            <button
              type="button"
              className="hover:underline"
              onClick={() => onQuestionList(row)}
            >
              Question ({count})
            </button>
          )}
          {showQuestion && showEdit && (
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

function makeAddQuestionsRenderer(
  onAddManually: (bank: Assessment) => void,
  onImportExcel: (bank: Assessment) => void,
) {
  return (p: ICellRendererParams<Assessment>) => (
    <div className="flex items-center gap-1.5">
      <Button
        size="sm"
        variant="default"
        className="h-8"
        onClick={() => p.data && onAddManually(p.data)}
      >
        Manually
      </Button>
      <Button
        size="sm"
        variant="default"
        className="h-8"
        onClick={() => p.data && onImportExcel(p.data)}
      >
        Excel
      </Button>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuestionBankPage() {
  const router = useRouter();
  const { user } = useSession();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingBank, setEditingBank] = useState<Assessment | null>(null);
  const [drawerBank, setDrawerBank] = useState<Assessment | null>(null);
  const [importingId, setImportingId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingImportBank = useRef<Assessment | null>(null);

  // Angular: roleName == 'ADMIN' → list all; else filter by preparedbyUser.userId
  const userId =
    user?.roleName === "ADMIN" ? undefined : (user?.userId ?? undefined);

  const {
    data: banks,
    isLoading: loading,
    invalidate,
  } = useCrudList({
    queryKey: QK.questionBanks.list(userId),
    queryFn: () => listQuestionBanks(userId),
    enabled: user !== null,
  });

  const openEdit = (bank: Assessment) => {
    setEditingBank(bank);
    setModalOpen(true);
  };

  const openQuestionList = (bank: Assessment) => {
    // Angular: only open when assessmentQuestionDTOs != null
    if (bank.assessmentQuestionDTOs == null) return;
    setDrawerBank(bank);
  };

  const handleAddQuestion = (bank: Assessment) => {
    // Angular queryParams: assessmentId, assessmentQuestionId: null, permission: 'Add', page
    router.push(
      `/assessments/question-bank/add-question?assessmentId=${bank.assessmentId}&assessmentQuestionId=&permission=Add&page=assessments/question-bank`,
    );
  };

  const handleImportClick = (bank: Assessment) => {
    pendingImportBank.current = bank;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const bank = pendingImportBank.current;
    e.target.value = "";

    if (!file) {
      toast.info("Please choose a file.");
      pendingImportBank.current = null;
      return;
    }
    if (!bank) return;

    setImportingId(bank.assessmentId);
    try {
      const questions = await importQuestionsFromExcel(file);
      for (const q of questions) {
        await addOrUpdateQuestion(
          buildImportedQuestionPayload(q, bank.assessmentId),
        );
      }
      toast.success("Questions imported successfully");
      invalidate();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Import failed");
    } finally {
      setImportingId(null);
      pendingImportBank.current = null;
    }
  };

  const columnDefs = useMemo<ColDef<Assessment>[]>(
    () => [
      COL_DEFS.siNo,
      {
        ...COL_DEFS.name,
        cellRenderer: makeBankNameRenderer(openQuestionList, openEdit),
        autoHeight: true,
      },
      COL_DEFS.description,
      COL_DEFS.createdDt,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.addQuestions,
        cellRenderer: makeAddQuestionsRenderer(
          handleAddQuestion,
          handleImportClick,
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <ListPage
      title="Question Banks"
      rowData={banks}
      columnDefs={columnDefs}
      loading={loading || importingId !== null}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
      }}
      toolbarTrailing={
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            asChild
            title="Download Sample Questions Excel File"
          >
            <a href="/assets/docs/QuestionSheet_bulk_upload.xlsx" download>
              <DownloadIcon className="h-4 w-4 mr-1" />
              Template
            </a>
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingBank(null);
              setModalOpen(true);
            }}
          >
            <PlusIcon className="h-4 w-4 mr-1" />
            Create Question Bank
          </Button>
        </div>
      }
      emptyState={
        <div className="flex flex-col items-center justify-center rounded-lg border border-border bg-card py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mb-3 opacity-40" />
          <p className="text-sm">No question banks found</p>
        </div>
      }
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".xls,.xlsx"
        className="hidden"
        onChange={handleFileChange}
      />

      <QuestionBankModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingBank(null);
        }}
        bank={editingBank}
        onSaved={invalidate}
        userId={user?.userId ?? 0}
      />

      <QuestionsListDrawer
        bank={drawerBank}
        onClose={() => setDrawerBank(null)}
        onEditQuestion={(bank, aqId) => {
          router.push(
            `/assessments/question-bank/add-question?assessmentId=${bank.assessmentId}&assessmentQuestionId=${aqId}&permission=Edit&page=assessments/question-bank`,
          );
        }}
        onDeleted={invalidate}
      />
    </ListPage>
  );
}
