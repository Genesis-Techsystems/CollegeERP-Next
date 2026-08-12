"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef, ICellRendererParams } from "ag-grid-community";
import { Eye, Pencil } from "lucide-react";
import { FilteredListPage } from "@/components/layout";
import { Select, type SelectOption } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MINIO_URL } from "@/config/constants/api";
import { useSessionContext } from "@/context/SessionContext";
import { QK } from "@/lib/query-keys";
import { rowIndexGetter } from "@/lib/utils";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import {
  getFeeCertificateWorkflowByWfId,
  getMentorshipAssignFilters,
  listCertificateWorkflowStatuses,
  listCollegeCertificatesByCollege,
  listEmpCertificateApprovals,
  pickCollegeCertificateByCode,
  updateFeeCertificateWorkflowApproval,
} from "@/services";
import type { EmpCertificateApprovalRow } from "@/types/tc-no-due";
import type { GeneralDetail } from "@/types/exam-master";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChangeStatusModal,
  type ChangeStatusResult,
} from "./ChangeStatusModal";
import { ViewWorkFlowsModal } from "./ViewWorkFlowsModal";

const DEFAULT_STUDENT_PHOTO = "/assets/images/avatars/default_Student.png";

type CollegeOptionRow = {
  fk_college_id: number;
  college_code: string;
  clg_sort_order?: number;
};

const COL_DEFS = {
  siNo: {
    headerName: "SI.No",
    valueGetter: rowIndexGetter,
    width: 70,
    flex: 0,
  } as ColDef<EmpCertificateApprovalRow>,
  photo: {
    headerName: "Photo",
    minWidth: 80,
    width: 90,
    flex: 0,
  } as ColDef<EmpCertificateApprovalRow>,
  student: {
    headerName: "Student",
    minWidth: 180,
  } as ColDef<EmpCertificateApprovalRow>,
  academic: {
    headerName: "Academic Details",
    minWidth: 160,
  } as ColDef<EmpCertificateApprovalRow>,
  dept: {
    field: "dept_name",
    headerName: "Department",
    minWidth: 130,
  } as ColDef<EmpCertificateApprovalRow>,
  certificate: {
    field: "certificate_name",
    headerName: "Certificate",
    minWidth: 130,
  } as ColDef<EmpCertificateApprovalRow>,
  status: {
    headerName: "Status",
    minWidth: 110,
  } as ColDef<EmpCertificateApprovalRow>,
  comments: {
    headerName: "Comments",
    minWidth: 120,
  } as ColDef<EmpCertificateApprovalRow>,
  reason: {
    field: "reason",
    headerName: "Reason",
    minWidth: 120,
  } as ColDef<EmpCertificateApprovalRow>,
  actions: {
    headerName: "Actions",
    minWidth: 110,
    width: 110,
    flex: 0,
  } as ColDef<EmpCertificateApprovalRow>,
};

function readStorage(key: string): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(key) ?? "";
}

function photoUrl(path: string | null | undefined): string {
  if (!path) return DEFAULT_STUDENT_PHOTO;
  const raw = String(path);
  if (/^https?:\/\//i.test(raw) || raw.startsWith("/assets/")) return raw;
  const base = String(MINIO_URL ?? "").replace(/\/$/, "");
  const cleaned = raw.replace(/^\/+/, "");
  return base ? `${base}/${cleaned}` : raw;
}

function statusBadge(detailName: string | null | undefined) {
  if (detailName == null || detailName === "") {
    return (
      <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800">
        Pending
      </span>
    );
  }
  if (detailName === "Due" || detailName === "Rejected") {
    return (
      <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
        {detailName}
      </span>
    );
  }
  if (detailName === "No Due" || detailName === "Approved") {
    return (
      <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-800">
        {detailName}
      </span>
    );
  }
  return (
    <span className="inline-flex rounded px-2 py-0.5 text-xs font-medium bg-muted text-foreground">
      {detailName}
    </span>
  );
}

function statusIdByCode(
  statuses: GeneralDetail[],
  code: string,
): number | null {
  const match = statuses.find((x) => x.generalDetailCode === code);
  return match ? Number(match.generalDetailId) : null;
}

/**
 * Angular `NoDueStatusComponent` — principal/dept TC No Due Approvals.
 */
export function NoDueStatusPage() {
  const { user } = useSessionContext();
  const queryClient = useQueryClient();

  const organizationId = Number(
    user?.organizationId ?? (Number(readStorage("organizationId")) || 0),
  );
  const employeeId = Number(
    user?.employeeId ?? (Number(readStorage("employeeId")) || 0),
  );

  const isPrincipal =
    Boolean(user?.isPrincipal) || readStorage("isPRINCIPAL") === "true";
  const isVicePrincipal =
    readStorage("isVicePrincipal") === "true" ||
    String(user?.roleName ?? "")
      .toUpperCase()
      .includes("VICEPRINCIPAL") ||
    String(user?.roleName ?? "")
      .toUpperCase()
      .includes("VICE PRINCIPAL");
  const isAccountant =
    readStorage("isAccountant") === "true" ||
    String(user?.roleName ?? "")
      .toUpperCase()
      .includes("ACCOUNTANT");
  const isFinanceOfficer =
    readStorage("isFinanceOfficer") === "true" ||
    String(user?.roleName ?? "")
      .toUpperCase()
      .includes("FINANCE");

  const canViewWorkflows =
    isPrincipal || isAccountant || isFinanceOfficer || isVicePrincipal;

  const [colleges, setColleges] = useState<CollegeOptionRow[]>([]);
  const [collegeId, setCollegeId] = useState<number | null>(null);
  const [nodueCertId, setNodueCertId] = useState(0);
  const [workflowStatuses, setWorkflowStatuses] = useState<GeneralDetail[]>([]);
  const [tabIndex, setTabIndex] = useState(0);
  const [requestRows, setRequestRows] = useState<EmpCertificateApprovalRow[]>(
    [],
  );
  const [processedRows, setProcessedRows] = useState<
    EmpCertificateApprovalRow[]
  >([]);
  const [loadingFilters, setLoadingFilters] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editRow, setEditRow] = useState<EmpCertificateApprovalRow | null>(
    null,
  );
  const [viewRow, setViewRow] = useState<EmpCertificateApprovalRow | null>(
    null,
  );

  const collegeOptions: SelectOption[] = useMemo(
    () =>
      colleges.map((c) => ({
        value: String(c.fk_college_id),
        label: String(c.college_code ?? c.fk_college_id),
      })),
    [colleges],
  );

  const loadList = useCallback(
    async (certId: number, statuses: GeneralDetail[], index: number) => {
      if (!employeeId || !certId) {
        setRequestRows([]);
        setProcessedRows([]);
        return;
      }

      const approvedId = statusIdByCode(statuses, "APPROVED");
      const nodueId = statusIdByCode(statuses, "NODUE");
      if (approvedId == null) {
        toastInfo("Certificate workflow statuses unavailable");
        return;
      }

      setLoadingList(true);
      try {
        const rows = await listEmpCertificateApprovals({
          employeeId,
          collegeCertificateId: certId,
          statusId: 0,
        });

        const pending: EmpCertificateApprovalRow[] = [];
        const processed: EmpCertificateApprovalRow[] = [];

        for (const row of rows) {
          const statusCatId = Number(row.fk_approval_status_catdet_id ?? 0);
          const withPhoto: EmpCertificateApprovalRow = {
            ...row,
            student_photo_path: photoUrl(row.student_photo_path),
          };

          if (isVicePrincipal) {
            if (statusCatId !== approvedId) pending.push(withPhoto);
            else processed.push(withPhoto);
          } else if (
            statusCatId !== approvedId &&
            (nodueId == null || statusCatId !== nodueId)
          ) {
            pending.push(withPhoto);
          } else if (
            statusCatId === approvedId ||
            (nodueId != null && statusCatId === nodueId)
          ) {
            processed.push(withPhoto);
          }
        }

        if (index === 0) {
          setRequestRows(pending);
          setProcessedRows([]);
        } else {
          setProcessedRows(processed);
          setRequestRows([]);
        }
      } catch (e) {
        toastError(e, "Unable to load no-due approvals");
        setRequestRows([]);
        setProcessedRows([]);
      } finally {
        setLoadingList(false);
      }
    },
    [employeeId, isVicePrincipal],
  );

  const loadCertificatesAndList = useCallback(
    async (clgId: number, statuses: GeneralDetail[], index: number) => {
      if (!clgId) return;
      setLoadingList(true);
      try {
        const certs = await listCollegeCertificatesByCollege(clgId);
        const nodue = pickCollegeCertificateByCode(certs, "NODUE");
        const certId = Number(nodue?.collegeCertificateId ?? 0);
        setNodueCertId(certId);
        if (!certId) {
          toastInfo("Not Available NODUE in Certificates");
          setRequestRows([]);
          setProcessedRows([]);
          setLoadingList(false);
          return;
        }
        await loadList(certId, statuses, index);
      } catch (e) {
        toastError(e, "Unable to load certificates");
        setNodueCertId(0);
        setRequestRows([]);
        setProcessedRows([]);
        setLoadingList(false);
      }
    },
    [loadList],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoadingFilters(true);
      try {
        const [filterResult, statuses] = await Promise.all([
          organizationId && employeeId
            ? getMentorshipAssignFilters(organizationId, employeeId)
            : Promise.resolve({ filtersData: [], academicYearData: [] }),
          listCertificateWorkflowStatuses(),
        ]);
        if (cancelled) return;

        setWorkflowStatuses(statuses);

        const filtersData = filterResult.filtersData;
        const seen = new Set<number>();
        const unique: CollegeOptionRow[] = [];
        for (const row of filtersData) {
          const id = Number(row.fk_college_id ?? 0);
          if (!id || seen.has(id)) continue;
          seen.add(id);
          unique.push({
            fk_college_id: id,
            college_code: String(row.college_code ?? id),
            clg_sort_order: Number(row.clg_sort_order ?? 0),
          });
        }
        unique.sort(
          (a, b) => (a.clg_sort_order ?? 0) - (b.clg_sort_order ?? 0),
        );
        setColleges(unique);

        if (unique.length > 0) {
          const firstId = unique[0]!.fk_college_id;
          setCollegeId(firstId);
          await loadCertificatesAndList(firstId, statuses, 0);
        }
      } catch (e) {
        if (!cancelled) toastError(e, "Unable to load colleges");
      } finally {
        if (!cancelled) setLoadingFilters(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [organizationId, employeeId, loadCertificatesAndList]);

  async function onCollegeChange(value: string) {
    const id = Number(value) || null;
    setCollegeId(id);
    setTabIndex(0);
    if (id == null) {
      setNodueCertId(0);
      setRequestRows([]);
      setProcessedRows([]);
      return;
    }
    await loadCertificatesAndList(id, workflowStatuses, 0);
  }

  async function onTabChange(value: string) {
    const index = value === "approved" ? 1 : 0;
    setTabIndex(index);
    if (!nodueCertId) {
      toastInfo("Not Available NODUE in Certificates");
      return;
    }
    await loadList(nodueCertId, workflowStatuses, index);
  }

  async function handleStatusSave(details: ChangeStatusResult) {
    if (!editRow) return;
    const wfId = Number(editRow.pk_fee_certificate_wf_id ?? 0);
    if (!wfId) {
      toastInfo("Workflow record not found");
      return;
    }

    setSaving(true);
    try {
      const workflow = await getFeeCertificateWorkflowByWfId(wfId);
      if (!workflow) {
        toastInfo("Workflow record not found");
        return;
      }
      const payload = {
        ...(workflow as Record<string, unknown>),
        approvalStatusId: details.approvalStatusId,
        comments: details.comments,
      };
      const result = await updateFeeCertificateWorkflowApproval(payload, {
        finalIssuer: isPrincipal || isVicePrincipal,
      });
      if (result.success) {
        toastSuccess(result.message ?? "Updated successfully");
        setEditRow(null);
        await queryClient.invalidateQueries({
          queryKey: QK.principalMyApprovals.all,
        });
        if (nodueCertId) {
          await loadList(nodueCertId, workflowStatuses, tabIndex);
        }
      } else {
        toastError(new Error(result.message ?? "Update failed"));
      }
    } catch (e) {
      toastError(e, "Failed to update approval status");
    } finally {
      setSaving(false);
    }
  }

  const tableRows = tabIndex === 0 ? requestRows : processedRows;

  const columnDefs = useMemo<ColDef<EmpCertificateApprovalRow>[]>(
    () => [
      COL_DEFS.siNo,
      {
        ...COL_DEFS.photo,
        cellRenderer: (p: ICellRendererParams<EmpCertificateApprovalRow>) => {
          const src = String(
            p.data?.student_photo_path ?? DEFAULT_STUDENT_PHOTO,
          );
          return (
            <div className="flex h-full items-center justify-center py-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt=""
                className="h-9 w-9 rounded-full object-cover"
                onError={(e) => {
                  if (!e.currentTarget.src.endsWith("default_Student.png")) {
                    e.currentTarget.src = DEFAULT_STUDENT_PHOTO;
                  }
                }}
              />
            </div>
          );
        },
      },
      {
        ...COL_DEFS.student,
        cellRenderer: (p: ICellRendererParams<EmpCertificateApprovalRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <div className="py-1 leading-snug">
              <div>
                {String(row.student_name ?? "")}{" "}
                <span className="font-medium text-blue-600">
                  {String(row.roll_number ?? "")}
                </span>
              </div>
              {row.student_mobile ? (
                <div className="text-xs text-muted-foreground">
                  {String(row.student_mobile)}
                </div>
              ) : null}
            </div>
          );
        },
      },
      {
        ...COL_DEFS.academic,
        cellRenderer: (p: ICellRendererParams<EmpCertificateApprovalRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <div className="py-1 leading-snug">
              <div>{String(row.academic_details ?? "")}</div>
              {row.batch_name ? (
                <div className="font-medium text-blue-600">
                  ({String(row.batch_name)})
                </div>
              ) : null}
            </div>
          );
        },
      },
      COL_DEFS.dept,
      COL_DEFS.certificate,
      {
        ...COL_DEFS.status,
        cellRenderer: (p: ICellRendererParams<EmpCertificateApprovalRow>) =>
          statusBadge(
            p.data?.Detail_Name != null ? String(p.data.Detail_Name) : null,
          ),
      },
      {
        ...COL_DEFS.comments,
        cellRenderer: (p: ICellRendererParams<EmpCertificateApprovalRow>) => {
          const row = p.data;
          if (!row) return "---";
          const detail = String(row.Detail_Name ?? "");
          if (row.comments != null && detail !== "No Due") {
            return String(row.comments);
          }
          return "---";
        },
      },
      COL_DEFS.reason,
      {
        ...COL_DEFS.actions,
        cellRenderer: (p: ICellRendererParams<EmpCertificateApprovalRow>) => {
          const row = p.data;
          if (!row) return null;
          return (
            <div className="flex items-center gap-1 py-1">
              {canViewWorkflows ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0"
                  aria-label="View"
                  disabled={saving}
                  onClick={() => setViewRow(row)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              ) : null}
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0"
                aria-label="Edit"
                disabled={saving}
                onClick={() => setEditRow(row)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
            </div>
          );
        },
      },
    ],
    [canViewWorkflows, saving],
  );

  return (
    <>
      <FilteredListPage
        title="TC No Due Approvals"
        filtersDefaultOpen
        filters={
          <form
            className="space-y-4"
            onSubmit={(e) => e.preventDefault()}
            noValidate
          >
            <Select
              label="Colleges *"
              value={collegeId != null ? String(collegeId) : ""}
              onChange={(v) => void onCollegeChange(v ?? "")}
              options={collegeOptions}
              placeholder="Colleges"
              isLoading={loadingFilters}
              clearable={false}
              className="max-w-xs sm:max-w-sm"
            />
          </form>
        }
        tableHeader={
          // Angular mat-tab-group: yellow active fill + full-width yellow underline
          <div className="-mx-5 -mt-2">
            <Tabs
              value={tabIndex === 0 ? "pending" : "approved"}
              onValueChange={(v) => void onTabChange(v)}
              className="w-full"
            >
              <TabsList className="app-dashboard-tabs h-9 w-full flex-wrap justify-start gap-0 rounded-none bg-white p-0">
                <TabsTrigger value="pending" className="app-dashboard-tab">
                  No Due List
                </TabsTrigger>
                <TabsTrigger value="approved" className="app-dashboard-tab">
                  No Due Approved List
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
        rowData={collegeId != null ? tableRows : []}
        columnDefs={columnDefs}
        loading={loadingList || saving || loadingFilters}
        pagination
        paginationPageSize={10}
        toolbar={{ searchPlaceholder: "Search" }}
      />

      <ChangeStatusModal
        open={editRow != null}
        row={editRow}
        isPrincipal={isPrincipal}
        isVicePrincipal={isVicePrincipal}
        onClose={() => setEditRow(null)}
        onSave={(payload) => {
          void handleStatusSave(payload);
        }}
      />

      <ViewWorkFlowsModal
        open={viewRow != null}
        row={viewRow}
        onClose={() => setViewRow(null)}
      />
    </>
  );
}
