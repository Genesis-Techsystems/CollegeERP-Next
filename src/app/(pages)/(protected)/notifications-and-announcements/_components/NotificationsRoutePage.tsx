"use client";

import { getNotificationsConfig } from "../_lib/route-config";
import { AddNotificationPage } from "./AddNotificationPage";
import { EmpNotificationsPage } from "./EmpNotificationsPage";
import { NotificationsDashboardPage } from "./NotificationsDashboardPage";
import { NotificationsListPage } from "./NotificationsListPage";
import { NotificationsPlaceholder } from "./NotificationsPlaceholder";

type NotificationsRoutePageProps = { slug: string };

export function NotificationsRoutePage({ slug }: NotificationsRoutePageProps) {
  const config = getNotificationsConfig(slug);

  // Angular `#/principal-communications/announcements` → EmpNotificationsComponent
  if (slug === "employee-inbox" || slug === "announcements") {
    return <EmpNotificationsPage />;
  }

  // Angular `#/notifications-&-announcements/notifications-list`
  if (slug === "notifications-list") {
    return <NotificationsListPage />;
  }

  // Angular add-notification
  if (slug === "add-notification") {
    return <AddNotificationPage />;
  }

  if (config.kind === "hub" && slug === "") {
    return <NotificationsDashboardPage />;
  }

  if (slug === "" || slug === "notifications-dashboard") {
    return <NotificationsDashboardPage />;
  }

  return <NotificationsPlaceholder slug={slug} />;
}
