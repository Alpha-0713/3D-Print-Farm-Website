import { jobsService, notificationAdapter } from "./services.js?v=2.2&rev=5";
export const notificationsService = notificationAdapter || {
  mode: "demo",
  listForJob: jobId => jobsService.listNotifications(jobId),
  get: notificationId => jobsService.getNotification(notificationId),
  retry: notificationId => jobsService.retryNotification(notificationId),
};
