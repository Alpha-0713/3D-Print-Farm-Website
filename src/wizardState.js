export function freshWizard() {
  return { step: 1, file: null, modelFile: null, previewStatus: "empty", fileFeedback: "", linkUrl: "", makerWorldPreview: null, makerWorldPreviewStatus: "idle",
    projectName: "", purpose: "Personal project", notes: "", inventoryId: "", material: "", color: "", submittedJob: null, submitting: false, submissionKey: crypto.randomUUID() };
}
export function restoreWizard(fields) {
  const wizard = freshWizard();
  for (const key of ["linkUrl", "projectName", "purpose", "notes", "inventoryId", "material", "color"]) if (typeof fields?.[key] === "string") wizard[key] = fields[key];
  return wizard;
}

export function draftFields(wizard) {
  return Object.fromEntries(["linkUrl", "projectName", "purpose", "notes", "inventoryId", "material", "color"].map(key => [key, typeof wizard[key] === "string" ? wizard[key] : ""]));
}
