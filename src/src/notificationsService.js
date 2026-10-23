import { jobsService } from "./services.js?v=7";

export const notificationsService = {
  mode: "mock",
  async listForJob(jobId) { return jobsService.listNotifications(jobId); },
  async get(notificationId) { return jobsService.getNotification(notificationId); },
  async retry(notificationId) { return jobsService.retryNotification(notificationId); },
  // Completion only creates a local notification record; it never sends email.
};
