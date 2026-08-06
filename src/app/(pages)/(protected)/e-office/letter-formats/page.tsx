"use client";

import { useMemo, useState } from "react";
import { EyeIcon, PencilIcon, PlusIcon } from "lucide-react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Select } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  createOfficeLetterFormat,
  listCollegesForEOffice,
  listOfficeLetterFormats,
  updateOfficeLetterFormat,
} from "@/services";
import { listOrganizations } from "@/services/admin/organization";
import type { OfficeLetterFormatRow } from "@/types/e-office";
import { LetterFormatModal } from "./_components/LetterFormatModal";
import { ViewLetterContentDialog } from "./_components/ViewLetterContentDialog";

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<OfficeLetterFormatRow>,
  college: {
    field: "collegeName",
    headerName: "College",
    minWidth: 120,
  } as ColDef<OfficeLetterFormatRow>,
  code: {
    field: "formatCode",
    headerName: "Format Code",
    minWidth: 110,
  } as ColDef<OfficeLetterFormatRow>,
  description: {
    field: "formatDescription",
    headerName: "Format Description",
    minWidth: 160,
    flex: 1,
  } as ColDef<OfficeLetterFormatRow>,
  content: {
    headerName: "Content",
    minWidth: 80,
    flex: 0,
    width: 80,
  } as ColDef<OfficeLetterFormatRow>,
  actions: {
    headerName: "Actions",
    minWidth: 86,
    flex: 0,
    width: 86,
  } as ColDef<OfficeLetterFormatRow>,
};

export default function LetterFormatsPage() {
  const qc = useQueryClient();
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [collegeId, setCollegeId] = useState<string | null>(null);
  const [listLoaded, setListLoaded] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<OfficeLetterFormatRow | null>(null);
  const [viewRow, setViewRow] = useState<OfficeLetterFormatRow | null>(null);

  const { data: organizations = [] } = useQuery({
    queryKey: ["eOffice", "organizations"],
    queryFn: listOrganizations,
  });

  const orgOptions = useMemo(
    () =>
      organizations.map((o) => ({
        value: String(o.organizationId),
        label: o.orgName ?? String(o.organizationId),
      })),
    [organizations],
  );

  const { data: colleges = [], isLoading: collegesLoading } = useQuery({
    queryKey: ["eOffice", "colleges", organizationId],
    queryFn: () => listCollegesForEOffice(Number(organizationId)),
    enabled: Boolean(organizationId),
  });

  const collegeOptions = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.collegeId ?? c.college_id),
        label: String(
          c.collegeCode ?? c.college_code ?? c.collegeName ?? c.college_id,
        ),
      })),
    [colleges],
  );

  const listReady = listLoaded && Boolean(organizationId && collegeId);

  const {
    data: rows = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: QK.eOffice.letterFormats(
      Number(organizationId),
      Number(collegeId),
    ),
    queryFn: () =>
      listOfficeLetterFormats(Number(organizationId), Number(collegeId)),
    enabled: listReady,
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: OfficeLetterFormatRow) => {
      if (payload.officeLetterFormatsId) {
        await updateOfficeLetterFormat(payload.officeLetterFormatsId, payload);
      } else {
        await createOfficeLetterFormat(payload);
      }
    },
    onSuccess: () => {
      toastSuccess("Letter format saved.");
      setModalOpen(false);
      setEditing(null);
      void refetch();
      void qc.invalidateQueries({ queryKey: QK.eOffice.all });
    },
    onError: (err) => toastError(getErrorMessage(err)),
  });

  const [filterErrors, setFilterErrors] = useState<{
    organizationId?: string;
    collegeId?: string;
  }>({});

  const columnDefs = useMemo<ColDef<OfficeLetterFormatRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.college,
      COL_DEFS.code,
      COL_DEFS.description,
      {
        ...COL_DEFS.content,
        cellRenderer: (p: ICellRendererParams<OfficeLetterFormatRow>) => (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="View content"
            onClick={() => setViewRow(p.data ?? null)}
          >
            <EyeIcon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<OfficeLetterFormatRow>) => (
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0"
            aria-label="Edit format"
            onClick={() => {
              setEditing(p.data ?? null);
              setModalOpen(true);
            }}
          >
            <PencilIcon className="h-3.5 w-3.5" />
          </Button>
        ),
      },
    ],
    [],
  );

  const selectedOrgName = organizations.find(
    (o) => String(o.organizationId) === organizationId,
  )?.orgName;
  const selectedCollege = colleges.find(
    (c) => String(c.collegeId ?? c.college_id) === collegeId,
  );
  const selectedCollegeCode =
    selectedCollege?.collegeCode ?? selectedCollege?.college_code;

  return (
    <FilteredListPage
      title="Letter Formats"
      filters={
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Select
            label="Organization"
            required
            value={organizationId}
            onChange={(v) => {
              setOrganizationId(v);
              setCollegeId(null);
              setListLoaded(false);
              setFilterErrors((prev) => ({
                ...prev,
                organizationId: undefined,
                collegeId: undefined,
              }));
            }}
            options={orgOptions}
            searchable
            placeholder="Enter Organization"
            error={filterErrors.organizationId}
          />
          <Select
            label="College"
            required
            value={collegeId}
            onChange={(v) => {
              setCollegeId(v);
              setListLoaded(false);
              setFilterErrors((prev) => ({ ...prev, collegeId: undefined }));
            }}
            options={collegeOptions}
            disabled={!organizationId}
            isLoading={collegesLoading}
            searchable
            placeholder="Enter College"
            error={filterErrors.collegeId}
          />
          <div className="flex items-end">
            <Button
              className="h-[30px] w-full sm:w-auto"
              onClick={() => {
                const next: { organizationId?: string; collegeId?: string } =
                  {};
                if (!organizationId)
                  next.organizationId = "Organization is required";
                if (!collegeId) next.collegeId = "College is required";
                setFilterErrors(next);
                if (next.organizationId || next.collegeId) return;
                setListLoaded(true);
              }}
            >
              Get List
            </Button>
          </div>
        </div>
      }
      rowData={listReady ? rows : []}
      columnDefs={columnDefs}
      loading={isLoading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: "Search letter formats…",
        pdfDocumentTitle: "Letter Formats",
      }}
      toolbarTrailing={
        <Button
          size="sm"
          className="h-[30px] px-3 text-[12px]"
          onClick={() => {
            const next: { organizationId?: string; collegeId?: string } = {};
            if (!organizationId)
              next.organizationId = "Organization is required";
            if (!collegeId) next.collegeId = "College is required";
            setFilterErrors(next);
            if (next.organizationId || next.collegeId) return;
            setEditing(null);
            setModalOpen(true);
          }}
        >
          <PlusIcon className="h-3.5 w-3.5 mr-1.5" />
          Letter Format
        </Button>
      }
    >
      <LetterFormatModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSave={(payload) => saveMutation.mutateAsync(payload)}
        organizationId={Number(organizationId)}
        collegeId={Number(collegeId)}
        initial={editing}
        isSubmitting={saveMutation.isPending}
      />

      <ViewLetterContentDialog
        open={Boolean(viewRow)}
        onClose={() => setViewRow(null)}
        row={viewRow}
        orgCode={selectedOrgName}
        collegeCode={selectedCollegeCode}
      />
    </FilteredListPage>
  );
}
