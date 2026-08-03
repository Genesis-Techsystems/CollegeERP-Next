import { AddNotificationPage } from "@/app/(pages)/(protected)/notifications-and-announcements/_components/AddNotificationPage";
import { EmpNotificationsPage } from "@/app/(pages)/(protected)/notifications-and-announcements/_components/EmpNotificationsPage";

type PageProps = {
  params: Promise<{ slug?: string[] }>;
};

/**
 * Angular:
 *  - `#/principal-communications/notifications/send-notifications`
 *  - `#/principal-communications/notifications/send-notifications/add-notification`
 */
export default async function PrincipalCommunicationsNotificationsPage({
  params,
}: PageProps) {
  const { slug = [] } = await params;
  const isAdd = slug.some((s) => s.toLowerCase() === "add-notification");

  if (isAdd) {
    return <AddNotificationPage />;
  }

  return <EmpNotificationsPage />;
}
