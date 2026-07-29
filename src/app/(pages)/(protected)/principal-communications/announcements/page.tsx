import { redirect } from 'next/navigation'

/** Angular `#/principal-communications/announcements` → React employee inbox. */
export default function PrincipalCommunicationsAnnouncementsRedirect() {
  redirect('/notifications-and-announcements/employee-inbox')
}
