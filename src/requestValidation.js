import { fileValidation } from "./fileValidation.js";
import { MATERIALS } from "./data.js?v=2.2&rev=5";
import { validation } from "./serviceError.js";

export const PURPOSES = ["Personal project", "Class project", "Functional prototype", "Engineering design", "Other"];
export function validateModelSource(payload) {
  const url = payload?.modelUrl ?? "";
  validation(typeof url === "string", "Enter a valid model URL.", "modelUrl");
  const files = Array.from(payload?.modelFiles || []);
  const attachments = payload?.attachments || [];
  validation(Array.isArray(attachments), "Choose valid attachments.", "attachments");
  if (url.trim()) {
    const result = fileValidation.inspectUrl(url);
    validation(result.valid, result.error, "modelUrl");
    validation(!payload.file && !files.length && !attachments.length, "Use either model files or a model link.", "modelUrl");
    return { modelUrl: result.url, files, attachments };
  }
  validation(files.length > 0 || attachments.length > 0, "Choose the original model file again or a successfully stored attachment. A filename alone cannot be submitted.", "files");
  validation(files.length + attachments.length <= 5, "Attach at most five model files.", "files");
  let total = 0;
  for (const file of files) {
    const result = fileValidation.inspectSelection(file);
    validation(result.valid && file instanceof Blob, result.error || "Choose the original model file again.", "files");
    total += file.size;
  }
  for (const attachment of attachments) {
    validation(typeof attachment?.id === "string" && attachment.id.length > 0 && attachment.id.length <= 120, "Choose a successfully stored attachment.", "attachments");
    fileValidation.validateMetadata(attachment);
    total += attachment.sizeBytes;
  }
  validation(total <= 50 * 1024 * 1024, "Attach no more than 50 MB in one request.", "files");
  if (files.length && payload.file) validation(files[0].name === payload.file.name && files[0].size === payload.file.sizeBytes, "Choose the original model file again before submitting.", "files");
  return { modelUrl: "", files, attachments };
}
export function validateRequest(payload) {
  validation(payload && typeof payload.projectName === "string" && payload.projectName.trim().length > 0 && payload.projectName.length <= 100, "Enter a project name of 1–100 characters.", "projectName");
  validation(payload.notes == null || typeof payload.notes === "string" && payload.notes.length <= 500, "Keep project notes to 500 characters.", "notes");
  validation(payload.purpose == null || PURPOSES.includes(payload.purpose), "Choose a supported purpose.", "purpose");
  validation(MATERIALS.some(({ id }) => id === payload.material), "Choose a supported print material.", "material");
  validation(typeof payload.color === "string" && payload.color.trim().length > 0 && payload.color.length <= 60, "Choose an available color.", "color");
  validation(typeof payload.inventoryId === "string" && payload.inventoryId.length > 0 && payload.inventoryId.length <= 120, "Choose an available filament by its ID.", "inventoryId");
  validation(payload.layerHeight == null || ["0.12", "0.16", "0.20", "0.24", "0.28"].includes(String(payload.layerHeight)), "Choose a supported layer height.", "layerHeight");
  validation(payload.infill == null || Number.isInteger(Number(payload.infill)) && Number(payload.infill) >= 0 && Number(payload.infill) <= 100, "Infill must be a whole percentage from 0 to 100.", "infill");
  return validateModelSource(payload);
}
