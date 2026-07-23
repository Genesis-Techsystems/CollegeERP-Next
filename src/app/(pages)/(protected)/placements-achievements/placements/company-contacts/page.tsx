"use client";

/**
 * Angular parity: company-contacts — card grid (not table).
 * Header: "Company : {name}" + Add Company Contact
 * Cards: personName, Edit, designation/details/landline/lastContactedOn/email, mobile footer
 * Back → companies list
 */

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CircleUserRound, Loader2, Phone } from "lucide-react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { useCrudList } from "@/hooks/useCrudList";
import { QK } from "@/lib/query-keys";
import { listCompanyContactsByCompany } from "@/services";
import type { CompanyContact } from "@/types/placements";
import { CompanyContactModal } from "./CompanyContactModal";

function displayValue(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  return raw || "";
}

function ContactCard({
  contact,
  onEdit,
}: {
  contact: CompanyContact;
  onEdit: () => void;
}) {
  return (
    <div className="flex min-h-[240px] flex-col bg-white shadow-md transition-shadow hover:shadow-lg">
      {/* Header */}
      <div className="flex h-16 min-h-16 max-h-16 items-center justify-between px-6">
        <div className="relative flex min-w-0 items-center gap-2">
          <CircleUserRound
            className="h-6 w-6 shrink-0 text-slate-700"
            aria-hidden
          />
          <span className="truncate text-base font-medium capitalize text-slate-900">
            {displayValue(contact.personName) || "—"}
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 border-[#42a5f5] px-3 text-sm font-medium text-[#1976d2] hover:bg-sky-50 hover:text-[#1565c0]"
          onClick={onEdit}
        >
          Edit
        </Button>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1 px-6 py-1 text-[16px] text-slate-800">
        <div>Designation : {displayValue(contact.designation)}</div>
        <div>Details : {displayValue(contact.details)}</div>
        <div>Landline : {displayValue(contact.landline)}</div>
        <div>Last Contacted On : {displayValue(contact.lastContactedOn)}</div>
        <div>Email : {displayValue(contact.emailid)}</div>
      </div>

      {/* Footer */}
      <div className="flex h-12 min-h-12 max-h-12 items-center justify-center border-t border-black/10 px-4">
        <span className="inline-flex items-center gap-2 text-sm font-medium text-[#00bcd4]">
          <Phone className="h-4 w-4" aria-hidden />
          {displayValue(contact.mobile) || "—"}
        </span>
      </div>
    </div>
  );
}

function CompanyContactsContent() {
  const router = useRouter();
  const params = useSearchParams();
  const companyId = Number(params.get("companyId") ?? 0);
  const companyname = params.get("companyname") ?? "";

  const [modalOpen, setModalOpen] = useState(false);
  const [editData, setEditData] = useState<CompanyContact | null>(null);

  const {
    data = [],
    isLoading,
    invalidate,
  } = useCrudList<CompanyContact>({
    queryKey: QK.companyContacts.byCompany(companyId),
    queryFn: () => listCompanyContactsByCompany(companyId),
    enabled: companyId > 0,
  });

  return (
    <PageContainer className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 px-1 pt-1">
        <h2 className="text-xl font-semibold text-slate-900">
          Company : {companyname || "—"}
        </h2>
        <Button
          type="button"
          onClick={() => {
            setEditData(null);
            setModalOpen(true);
          }}
          disabled={!companyId}
        >
          + Add Company Contact
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading contacts…
        </div>
      ) : data.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No company contacts found.
        </p>
      ) : (
        <div className="mx-auto grid w-full max-w-[1040px] grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((contact) => (
            <div key={contact.companyContactId} className="p-4">
              <ContactCard
                contact={contact}
                onEdit={() => {
                  setEditData(contact);
                  setModalOpen(true);
                }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="flex justify-end px-1 pb-2">
        <Button
          type="button"
          className="min-w-[88px] bg-[#f0c040] text-slate-900 hover:bg-[#e5b535]"
          onClick={() =>
            router.push("/placements-achievements/placements/companies")
          }
        >
          Back
        </Button>
      </div>

      <CompanyContactModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        editData={editData}
        companyId={companyId}
        onSaved={invalidate}
      />
    </PageContainer>
  );
}

export default function CompanyContactsPage() {
  return (
    <Suspense
      fallback={
        <PageContainer>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </PageContainer>
      }
    >
      <CompanyContactsContent />
    </Suspense>
  );
}
