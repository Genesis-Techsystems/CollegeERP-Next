"use client";

/**
 * Angular `student-pay-dialog` — confirm before posting stgOnlineFeereceipts.
 */
import { FormModal } from "@/common/components/feedback";

export type StudentPayDialogData = {
  firstName?: string;
  collegeCode?: string;
  academicYear?: string;
  courseCode?: string;
  groupCode?: string;
  courseYearName?: string;
  section?: string;
  courseYearNo?: string | number;
  feeParticularwisePayments?: { amount?: number }[];
};

export function StudentPayDialog({
  open,
  data,
  isSubmitting,
  onClose,
  onPay,
}: {
  open: boolean;
  data: StudentPayDialogData | null;
  isSubmitting?: boolean;
  onClose: () => void;
  onPay: () => void;
}) {
  const total = (data?.feeParticularwisePayments ?? []).reduce(
    (sum, row) => sum + (Number(row.amount) || 0),
    0,
  );

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Pay Details"
      submitLabel="Pay"
      cancelLabel="Close"
      size="lg"
      showHeaderDivider
      isSubmitting={isSubmitting}
      onSubmit={(e) => {
        e.preventDefault();
        onPay();
      }}
    >
      <div className="space-y-2 text-[15px]">
        <Row label="Student :" value={data?.firstName} />
        <Row
          label="College :"
          value={`${data?.collegeCode ?? ""} / (${data?.academicYear ?? ""})`}
        />
        <Row
          label="Course Details :"
          value={`${data?.courseCode ?? ""} / ${data?.groupCode ?? ""} / ${data?.courseYearName ?? ""} / Section ${data?.section ?? ""}`}
        />
        {data?.courseYearNo != null && String(data.courseYearNo) !== "" ? (
          <Row label="Payment For :" value={`${data.courseYearNo} Year fees`} />
        ) : null}
      </div>

      <table className="mt-3 w-full border-collapse text-[14px]">
        <thead>
          <tr className="bg-[#c3d9ff]">
            <th className="border px-3 py-2 text-left font-medium" colSpan={2}>
              Total Pay Amount
            </th>
            <th className="border px-3 py-2 text-right font-medium">{total}</th>
          </tr>
        </thead>
      </table>
      <p className="mt-2 text-[13px] font-medium text-red-600">
        Note : Please check the receipt before leaving the window.
      </p>
    </FormModal>
  );
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[20%_1fr] gap-2">
      <p className="text-slate-800">{label}</p>
      <p className="font-medium text-blue-600">{value}</p>
    </div>
  );
}
