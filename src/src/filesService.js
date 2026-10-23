export const MAX_MODEL_FILE_SIZE = 25 * 1024 * 1024;
export const ACCEPTED_MODEL_EXTENSIONS = ["stl", "3mf"];

function getExtension(name) {
  return name.trim().toLowerCase().split(".").pop();
}

function isValidSize(sizeBytes) {
  return Number.isFinite(sizeBytes) && sizeBytes >= 0;
}

export const filesService = {
  mode: "metadata-only",
  inspectSelection(file) {
    if (!file) {
      return { valid: false, error: "Choose a file." };
    }
    if (typeof file.name !== "string" || !file.name.trim()) {
      return { valid: false, error: "Choose a file with a filename." };
    }

    const extension = getExtension(file.name);
    if (!ACCEPTED_MODEL_EXTENSIONS.includes(extension)) {
      return { valid: false, error: "Unsupported file type. Choose an STL or 3MF file." };
    }
    if (!isValidSize(file.size)) {
      return { valid: false, error: "The selected file has an invalid size." };
    }
    if (file.size > MAX_MODEL_FILE_SIZE) {
      return { valid: false, error: "This file is larger than the 25 MB demo limit." };
    }

    // Do not read, parse, upload, or retain file contents.
    return {
      valid: true,
      metadata: {
        name: file.name,
        sizeBytes: file.size,
      },
    };
  },
  validateMetadata(metadata) {
    if (!metadata || typeof metadata.name !== "string" || !metadata.name.trim()) {
      throw new Error("Choose a model file again before submitting.");
    }

    const extension = getExtension(metadata.name);
    if (!ACCEPTED_MODEL_EXTENSIONS.includes(extension)) {
      throw new Error("Choose an STL or 3MF file.");
    }
    if (!isValidSize(metadata.sizeBytes)) {
      throw new Error("The model file size must be a non-negative, finite value.");
    }
    if (metadata.sizeBytes > MAX_MODEL_FILE_SIZE) {
      throw new Error("The model must be 25 MB or smaller.");
    }

    return true;
  },
};
