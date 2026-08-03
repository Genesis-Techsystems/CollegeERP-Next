"use client";

import PrincipalToDeptEmailPage from "@/app/(pages)/(protected)/email-sms/principal-to-dept-email/page";

/**
 * Angular `#/principal-communications/email/send-emails`
 * → EmailModule → PrincipalToDptEmailComponent
 *
 * Reuses the existing Email & SMS screen (no UI fork).
 */
export default function PrincipalCommunicationsSendEmailsPage() {
  return <PrincipalToDeptEmailPage />;
}
