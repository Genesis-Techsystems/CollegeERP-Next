"use client";

/**
 * Angular `survey-forms-list` — list SurveyForm + navigate to add/edit.
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { format, isValid, parseISO } from "date-fns";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { PlusIcon } from "lucide-react";
import { ListPage } from "@/components/layout";
import { StatusBadge } from "@/common/components/data-display";
import { TableRowActions } from "@/common/components/table";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { listSurveyForms } from "@/services";
import type { SurveyFormRow } from "@/types/survey-form";

/** Angular `date:'MMMM d, y'` */
function formatSurveyDay(value?: string | null): string {
  if (!value) return "";
  const d = parseISO(value.includes("T") ? value : `${value}T00:00:00`);
  const date = isValid(d) ? d : new Date(value);
  return isValid(date) ? format(date, "MMMM d, yyyy") : value;
}

function surveyDateRenderer(p: ICellRendererParams<SurveyFormRow>) {
  const row = p.data;
  if (!row) return null;
  const start = formatSurveyDay(row.surveyStartDate);
  const end = formatSurveyDay(row.surveyEndDate);
  if (!start && !end) return "—";
  return `${start} - ${end}`;
}

function statusRenderer(p: ICellRendererParams<SurveyFormRow>) {
  return <StatusBadge status={p.data?.isActive ?? false} />;
}

function makeActionsRenderer(onEdit: (row: SurveyFormRow) => void) {
  return (p: ICellRendererParams<SurveyFormRow>) => {
    const row = p.data;
    if (!row) return null;
    return (
      <TableRowActions
        onEdit={() => onEdit(row)}
        editLabel="Edit survey form"
      />
    );
  };
}

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 80,
    flex: 0,
  } as ColDef<SurveyFormRow>,
  surveyName: {
    field: "surveyName",
    headerName: "Survey Name",
    minWidth: 160,
  } as ColDef<SurveyFormRow>,
  surveyDate: {
    headerName: "Survey Date",
    minWidth: 220,
  } as ColDef<SurveyFormRow>,
  fbfromCode: {
    field: "fbfromCode",
    headerName: "Feedback From",
    minWidth: 120,
  } as ColDef<SurveyFormRow>,
  fbforCode: {
    field: "fbforCode",
    headerName: "Feedback For",
    minWidth: 120,
  } as ColDef<SurveyFormRow>,
  collegeCode: {
    field: "collegeCode",
    headerName: "College",
    minWidth: 110,
  } as ColDef<SurveyFormRow>,
  isActive: {
    field: "isActive",
    headerName: "Status",
    minWidth: 110,
  } as ColDef<SurveyFormRow>,
  actions: {
    headerName: "Actions",
    minWidth: 100,
    width: 100,
    flex: 0,
  } as ColDef<SurveyFormRow>,
};

export default function SurveyFormsListPage() {
  const router = useRouter();

  const { data: rows = [], isLoading } = useCrudList({
    queryKey: QK.surveyForms.list(),
    queryFn: listSurveyForms,
  });

  const columnDefs = useMemo<ColDef<SurveyFormRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.surveyName,
      { ...COL_DEFS.surveyDate, cellRenderer: surveyDateRenderer },
      COL_DEFS.fbfromCode,
      COL_DEFS.fbforCode,
      COL_DEFS.collegeCode,
      { ...COL_DEFS.isActive, cellRenderer: statusRenderer },
      {
        ...COL_DEFS.actions,
        cellRenderer: makeActionsRenderer((row) => {
          const params = new URLSearchParams({
            surveyFormId: String(row.surveyFormId ?? ""),
          });
          router.push(`/feedback/survey-form?${params}`);
        }),
      },
    ],
    [router],
  );

  return (
    <ListPage
      title="Survey Forms"
      subtitle=""
      rowData={rows}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search",
        pdfDocumentTitle: "Survey Forms",
        exportExcel: false,
        exportPdf: false,
      }}
      toolbarTrailing={
        <Button
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          onClick={() => router.push("/feedback/survey-form")}
        >
          <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
          Add Survey Form
        </Button>
      }
    />
  );
}
