// Compatibility for demo fixtures. Application components use filesService.
import { config } from "./config.js";
export { jobAttachments } from "./attachments.js";
export const MODEL_FILES_DATABASE = "three-d-print-farm-model-files";
export const modelFilesStore = config.mode === "demo" ? (await import("./demo/fileStore.js")).modelFilesStore : undefined;
