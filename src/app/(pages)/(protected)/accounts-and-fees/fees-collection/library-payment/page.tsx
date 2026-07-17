import { redirect } from "next/navigation";

/** Angular library-payment module entry → library-fee-payment (student fee list). */
export default function LibraryPaymentPage() {
  redirect(
    "/accounts-and-fees/fees-collection/library-payment/library-fee-payment",
  );
}
