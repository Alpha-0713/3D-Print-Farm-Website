import { config } from "./config.js";
import { authService } from "./authService.js?v=2.2&rev=5";
import { fileValidation } from "./fileValidation.js";
import { ServiceError, validation } from "./serviceError.js";
export { MAX_MODEL_FILE_SIZE, ACCEPTED_MODEL_EXTENSIONS, getModelFileExtension } from "./fileValidation.js";
export function createHttpFiles(client) {
  return {
    ...fileValidation, mode: "api",
    async upload(files, { idempotencyKey } = {}) {
      validation(idempotencyKey, "An upload idempotency key is required.");
      const form = new FormData();
      for (const file of files) { const result = fileValidation.inspectSelection(file); validation(result.valid && file instanceof Blob, result.error || "Choose the original file."); form.append("files", file, file.name); }
      const result = await client.request("/attachments", { method: "POST", body: form, idempotencyKey });
      if (!Array.isArray(result) || result.length !== files.length || result.some((a, i) => a?.status !== "stored" || !a.id || a.name !== files[i].name || a.sizeBytes !== files[i].size)) throw new ServiceError("invalid_response", "The server did not confirm that every original was stored.");
      return result;
    },
    async get(id) {
      const metadata = await this.getAttachment(id);
      if (metadata.status !== "stored") throw new ServiceError("validation", "The original is not ready for download.");
      const blob = await client.request(`/attachments/${encodeURIComponent(id)}/original`, { binary: true });
      if (blob.size !== metadata.sizeBytes) throw new ServiceError("invalid_response", "The downloaded original is incomplete.");
      return new File([blob], metadata.name, { type: blob.type });
    },
    getAttachment: id => client.request(`/attachments/${encodeURIComponent(id)}`),
    async verify(attachments) {
      for (const attachment of attachments) {
        const saved = await this.getAttachment(attachment.id);
        validation(saved?.status === "stored" && saved.name === attachment.name && saved.sizeBytes === attachment.sizeBytes, "The stored attachment is unavailable or changed. Upload the original again.");
      }
      return attachments;
    },
    // Unclaimed uploads are expired by the backend; never delete on an uncertain job response.
  };
}
const implementation = config.mode === "demo"
  ? (await import("./demo/files.js")).demoFiles
  : createHttpFiles(authService.client);
export const filesService = implementation;
