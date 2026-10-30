import { fileValidation } from "../fileValidation.js";
import { modelFilesStore } from "./fileStore.js";
import { validation } from "../serviceError.js";
export const demoFiles = {
  ...fileValidation, mode: "demo",
  upload: files => modelFilesStore.save(files),
  get: id => modelFilesStore.get(id),
  async getAttachment(id) {
    const file = await modelFilesStore.get(id);
    return file ? { id, name: file.name, sizeBytes: file.size, status: "stored" } : null;
  },
  async verify(attachments) {
    for (const attachment of attachments) {
      const file = await modelFilesStore.get(attachment.id);
      validation(file && file.name === attachment.name && file.size === attachment.sizeBytes, "The stored original is unavailable. Choose the model file again.");
    }
    return attachments;
  },
};
