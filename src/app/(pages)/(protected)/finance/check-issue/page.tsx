"use client";

import { useState } from "react";
import { FilteredListPage } from "@/components/layout";
import { useFinanceCascade } from "../_lib/use-finance-cascade";
import { useQuery } from "@tanstack/react-query";
import { listFinChequeIssuesByEntity } from "@/services/finance";
import { FinChequeIssue } from "@/types/finance";
import { ColDef, ICellRendererParams } from "ag-grid-community";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { PencilIcon } from "lucide-react";
import { StatusBadge } from "@/common/components/data-display/StatusBadge";
import CheckIssueModal from "./CheckIssueModal";

export default function CheckIssuePage() {
  const [tab, setTab] = useState<"issue" | "intersection">("issue");
  const isIntersection = tab === "intersection";

  const cascade = useFinanceCascade();
  const { accountEntityId } = cascade;

  const {
    data: allChequeIssues = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["FinChequeIssue", "byEntity", accountEntityId],
    queryFn: () => listFinChequeIssuesByEntity(accountEntityId),
    enabled: accountEntityId > 0,
  });

  const rowData = allChequeIssues.filter(
    (c) => !!c.isIntersection === isIntersection,
  );

  const [editData, setEditData] = useState<FinChequeIssue | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleEdit = (row: FinChequeIssue) => {
    setEditData(row);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditData(null);
    setIsModalOpen(true);
  };

  function actionRenderer(
    setRow: (r: FinChequeIssue | null) => void,
    setOpen: (b: boolean) => void,
  ) {
    return (p: ICellRendererParams<FinChequeIssue>) => (
      <Button
        size="sm"
        variant="ghost"
        className="h-8 w-8 p-0"
        onClick={() => {
          setRow(p.data ?? null);
          setOpen(true);
        }}
      >
        <PencilIcon className="h-3.5 w-3.5" />
      </Button>
    );
  }

  function statusRenderer(p: ICellRendererParams<FinChequeIssue>) {
    return <StatusBadge status={p.value} />;
  }

  function dateRenderer(p: ICellRendererParams<FinChequeIssue>) {
    return p.value ? new Date(p.value).toLocaleDateString("en-GB") : "";
  }

  const COL_DEFS: Record<string, ColDef<FinChequeIssue>> = {
    entityCode: {
      field: "entityCode",
      headerName: "Entity",
      minWidth: 100,
      flex: 0,
    },
    bankName: {
      field: "bankCode",
      headerName: "Bank Name",
      minWidth: 120,
      flex: 1,
    },
    accountNumber: {
      field: "finBankAccountNumber",
      headerName: "Account No.",
      minWidth: 140,
      flex: 1,
    },
    chequebookSerialNo: {
      field: "chequebookSerialNo",
      headerName: "Cheque No.",
      minWidth: 120,
      flex: 1,
    },
    issuedChequeNo: {
      field: "issuedChequeNo",
      headerName: "Issued Cheque No.",
      minWidth: 150,
      flex: 1,
    },
    chequeDate: {
      field: "chequeDate",
      headerName: "Cheque Date",
      minWidth: 120,
      flex: 1,
      cellRenderer: dateRenderer,
    },
    inFavourTowards: {
      field: "inFavourTowards",
      headerName: "In Favour Of/Towards",
      minWidth: 180,
      flex: 1,
    },
    particulars: {
      field: "particulars",
      headerName: "Particulars",
      minWidth: 150,
      flex: 1,
    },
    amount: { field: "amount", headerName: "Amount", minWidth: 100, flex: 0 },
    paymentNoteNo: {
      field: "paymentNoteNo",
      headerName: "Payment Note No",
      minWidth: 150,
      flex: 1,
    },
    payment: {
      field: "payment",
      headerName: "Payment",
      minWidth: 100,
      flex: 0,
    },
    receiptNo: {
      field: "receiptNo",
      headerName: "Receipt No.",
      minWidth: 100,
      flex: 0,
    },
    isActive: {
      field: "isActive",
      headerName: "Active",
      minWidth: 90,
      flex: 0,
      cellRenderer: statusRenderer,
    },
    actions: {
      headerName: "Actions",
      minWidth: 100,
      flex: 0,
      cellRenderer: actionRenderer(setEditData, setIsModalOpen),
    },
  };

  const columns = [
    COL_DEFS.entityCode,
    COL_DEFS.bankName,
    COL_DEFS.chequebookSerialNo,
    COL_DEFS.accountNumber,
    COL_DEFS.issuedChequeNo,
    COL_DEFS.chequeDate,
    COL_DEFS.inFavourTowards,
    COL_DEFS.particulars,
    ...(isIntersection
      ? [COL_DEFS.payment, COL_DEFS.receiptNo]
      : [COL_DEFS.paymentNoteNo]),
    COL_DEFS.amount,
    COL_DEFS.isActive,
    COL_DEFS.actions,
  ];

  return (
    <>
      <FilteredListPage
        title="Check Issue"
        breadcrumbs={[
          { label: "Finance", href: "/finance" },
          { label: "Check Issue" },
        ]}
        onFilterApply={() => refetch()}
        filters={
          <div className="flex gap-4 items-end">
            {cascade.collegeSelect}
            {cascade.entitySelect}
          </div>
        }
        filterValidity={accountEntityId > 0}
        filterErrorMessage="Please select an entity"
        rowData={rowData}
        columnDefs={columns}
        isLoading={isLoading}
        onAddClick={accountEntityId > 0 ? handleAdd : undefined}
        addButtonLabel={
          isIntersection ? "Add Intersection" : "Add Cheque Issue"
        }
        beforeTable={
          <div className="mb-4">
            <Tabs
              value={tab}
              onValueChange={(v) => setTab(v as any)}
              className="w-[400px]"
            >
              <TabsList>
                <TabsTrigger value="issue">Cheque Issue</TabsTrigger>
                <TabsTrigger value="intersection">Intersection</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        }
      />

      <CheckIssueModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editData={editData}
        onSaved={refetch}
        isIntersection={isIntersection}
      />
    </>
  );
}
