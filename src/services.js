import { config } from "./config.js";
import { authService } from "./authService.js?v=2.2&rev=5";
import { filesService } from "./filesService.js?v=2.2&rev=5";
const services = config.mode === "demo" ? await import("./demo/services.js")
  : (await import("./httpServices.js")).createHttpServices({ session: authService, files: filesService });
export const { jobsService, inventoryService, contributionsService, hoursService, inboxService, presenceService, directoryService, diagnosticsService, refreshService, resetLocalData } = services;
export const LOCAL_DATA_KEYS = services.LOCAL_DATA_KEYS || [];
export const rgbFromHex = value => {
  const match = /^#?([\da-f]{6})$/i.exec(String(value || "").trim());
  return match ? `RGB(${[0, 2, 4].map(offset => parseInt(match[1].slice(offset, offset + 2), 16)).join(", ")})` : "";
};
export const notificationAdapter = services.notificationsService;
