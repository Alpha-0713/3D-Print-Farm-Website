import { jobAttachments, modelFilesStore } from "./modelFilesStore.js?v=2.3";
import { ACCEPTED_MODEL_EXTENSIONS, getModelFileExtension } from "./filesService.js?v=2.2&rev=5";
import { esc } from "./pageShared.js?v=2.2&rev=5";

let controller = null;

export function jobModelFiles(job) {
  const attachments = jobAttachments(job);
  return `<section class="detail-section job-model-files" data-job-id="${esc(job.id)}">
    <div class="job-files-heading"><h2>Model files</h2><p>Original files saved in this browser · demonstration only</p></div>
    ${attachments.length ? `<ul class="job-file-list">${attachments.map((file, index) => `<li class="job-file-row" data-file-index="${index}">
      <div class="job-file-name"><strong>${esc(file.name || "Unnamed file")}</strong><small data-file-status>${file.id ? "Checking saved original…" : "Original file unavailable · this older demo record contains a filename only."}</small></div>
      <div class="job-file-actions"><button type="button" class="button button-outline button-small" data-action="preview-job-file" data-index="${index}" data-id="${esc(job.id)}" disabled aria-pressed="false" aria-label="Preview ${esc(file.name)}">Preview</button>
      <button type="button" class="button button-outline button-small" data-action="download-job-file" data-index="${index}" data-id="${esc(job.id)}" disabled aria-label="Download original ${esc(file.name)}">Download <span aria-hidden="true">↓</span></button></div>
    </li>`).join("")}</ul>` : `<p class="job-file-empty">${job.modelUrl ? "This request contains a model link. No original file was attached." : "No model files were attached to this job."}</p>`}
    <div class="job-file-viewer" hidden><div class="job-preview-heading"><span data-preview-name></span><button type="button" class="button button-outline button-small" data-action="reset-job-camera" data-id="${esc(job.id)}" disabled>Reset view</button></div>
      <div class="model-preview job-model-preview" role="group" aria-label="Interactive job model preview"><p class="model-preview-message" role="status" aria-live="polite"></p></div>
    </div>
  </section>`;
}

export function disposeJobFiles() { if (controller) controller.disposed = true; controller = null; }

export async function mountJobFiles(root, job, loadViewer) {
  disposeJobFiles();
  const panel = root.querySelector(".job-model-files");
  if (!panel) return;
  const current = { jobId: job.id, disposed: false, files: new Map(), revision: 0, viewer: null, preview: null };
  controller = current;
  const alive = () => !current.disposed && panel.isConnected;
  current.preview = async index => {
    const file = current.files.get(index);
    if (!alive() || !file || !ACCEPTED_MODEL_EXTENSIONS.includes(getModelFileExtension(file.name))) return;
    const revision = ++current.revision;
    const wrap = panel.querySelector(".job-file-viewer");
    const stage = panel.querySelector(".job-model-preview");
    const reset = panel.querySelector('[data-action="reset-job-camera"]');
    wrap.hidden = false;
    reset.disabled = true;
    panel.querySelector("[data-preview-name]").textContent = file.name;
    panel.querySelectorAll('[data-action="preview-job-file"]').forEach(button => button.setAttribute("aria-pressed", String(Number(button.dataset.index) === index)));
    stage.setAttribute("aria-busy", "true");
    // Dispose the prior canvas before displaying another file's status.
    current.viewer?.disposeModelPreview();
    stage.innerHTML = '<p class="model-preview-message" role="status" aria-live="polite">Loading model geometry…</p>';
    try {
      const viewer = await loadViewer();
      if (!alive() || revision !== current.revision) return;
      current.viewer = viewer;
      await viewer.mountModelPreview(stage, file, (status, message) => {
        if (!alive() || revision !== current.revision) return;
        stage.setAttribute("aria-busy", String(status === "loading"));
        reset.disabled = status !== "ready";
        if (status === "error") panel.querySelector(`[data-file-index="${index}"] [data-file-status]`).textContent = `${message} The original is still available to download.`;
      });
    } catch {
      if (!alive() || revision !== current.revision) return;
      stage.setAttribute("aria-busy", "false");
      stage.querySelector(".model-preview-message").textContent = "The viewer could not load. Check your connection. The original file is still available to download.";
    }
  };
  await Promise.all(jobAttachments(job).map(async (metadata, index) => {
    if (!metadata.id) return;
    const row = panel.querySelector(`[data-file-index="${index}"]`);
    try {
      const file = await modelFilesStore.get(metadata.id);
      if (!alive()) return;
      if (!file) { row.querySelector("[data-file-status]").textContent = "Original file unavailable in this browser. It may have been cleared or saved on another device."; return; }
      current.files.set(index, file);
      const supported = ACCEPTED_MODEL_EXTENSIONS.includes(getModelFileExtension(file.name));
      row.querySelector("[data-file-status]").textContent = `${(file.size / 1024).toFixed(1)} KB · ${supported ? "Original file available" : "Preview unsupported · original download available"}`;
      row.querySelector('[data-action="download-job-file"]').disabled = false;
      row.querySelector('[data-action="preview-job-file"]').disabled = !supported;
    } catch (error) { if (alive()) row.querySelector("[data-file-status]").textContent = error.message; }
  }));
  if (!alive()) return;
  const first = [...current.files.keys()].sort((a, b) => a - b).find(index => ACCEPTED_MODEL_EXTENSIONS.includes(getModelFileExtension(current.files.get(index).name)));
  if (first !== undefined) await current.preview(first);
}

export async function previewJobFile(index, jobId) { if (controller?.jobId === jobId) await controller.preview(index); }
export function resetJobCamera(jobId) { if (controller?.jobId === jobId) controller.viewer?.resetModelPreview(); }
export function downloadJobFile(index, jobId) {
  const file = controller?.files.get(index);
  if (!file || controller.disposed || controller.jobId !== jobId) throw new Error("The original file is unavailable. Open the job details again to check its files.");
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url; link.download = file.name; link.hidden = true;
  document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
