import { redirect } from "next/navigation";

/** Angular bus-payment module entry → bus-fee-payment (student fee list). */
export default function BusPaymentPage() {
  redirect("/accounts-and-fees/fees-collection/bus-payment/bus-fee-payment");
}
