import { redirect } from 'next/navigation'

/** Hostel fee collection lives under Accounts & Fees (Angular: fees-collection/hostel-payment). */
export default function HostelPaymentRedirectPage() {
  redirect('/accounts-and-fees/fees-collection/hostel-payment')
}
