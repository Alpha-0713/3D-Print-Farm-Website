export const MAX_MODEL_FILE_SIZE = 25 * 1024 * 1024;
export const ACCEPTED_MODEL_EXTENSIONS = ["stl", "3mf", "obj"];

export function getModelFileExtension(name = "") {
  const cleanName = String(name).trim();
  const dot = cleanName.lastIndexOf(".");
  return dot < 0 ? "" : cleanName.slice(dot + 1).toLowerCase();
}

function isValidSize(sizeBytes) {
  return Number.isFinite(sizeBytes) && sizeBytes > 0;
}

export const fileValidation = {
  mode: "local-preview-only",
  inspectSelection(file) {
    if (!file) {
      return { valid: false, error: "Choose a model file." };
    }
    if (typeof file.name !== "string" || !file.name.trim() || file.name.length > 255) {
      return { valid: false, error: "Choose a file with a filename of at most 255 characters." };
    }

    const extension = getModelFileExtension(file.name);
    if (!ACCEPTED_MODEL_EXTENSIONS.includes(extension)) {
      return { valid: false, error: "Unsupported file type. Choose an STL, 3MF, or OBJ file." };
    }
    if (!isValidSize(file.size)) {
      return { valid: false, error: "The selected model file is empty or has an invalid size." };
    }
    if (file.size > MAX_MODEL_FILE_SIZE) {
      return { valid: false, error: "This file is larger than the 25 MB demo limit." };
    }

    return {
      valid: true,
      metadata: { name: file.name, sizeBytes: file.size, extension },
    };
  },
  inspectUrl(value) {
    if (typeof value !== "string" || value.trim().length > 2048) return { valid: false, error: "Keep model URLs under 2049 characters." };
    let url;
    try {
      url = new URL(String(value || "").trim());
    } catch {
      return { valid: false, error: "Enter a valid model URL." };
    }
    if (url.protocol !== "https:") {
      return { valid: false, error: "Use a direct HTTPS URL. Other protocols are not supported." };
    }
    if (url.username || url.password) {
      return { valid: false, error: "URLs containing a username or password are not supported." };
    }
    return { valid: true, url: url.href };
  },
  validateMetadata(metadata) {
    if (!metadata || typeof metadata.name !== "string" || !metadata.name.trim() || metadata.name.length > 255) {
      throw new Error("Choose a model file again before submitting.");
    }

    const extension = getModelFileExtension(metadata.name);
    if (!ACCEPTED_MODEL_EXTENSIONS.includes(extension)) {
      throw new Error("Choose an STL, 3MF, or OBJ file.");
    }
    if (!isValidSize(metadata.sizeBytes)) {
      throw new Error("The model file is empty or has an invalid size.");
    }
    if (metadata.sizeBytes > MAX_MODEL_FILE_SIZE) {
      throw new Error("The model must be 25 MB or smaller.");
    }

    return true;
  },
};
