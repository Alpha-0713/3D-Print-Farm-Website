import { fileValidation as filesService } from "../fileValidation.js";

export const MODEL_FILES_DATABASE = "three-d-print-farm-model-files";
const STORE = "originals";

async function database() {
  if (!globalThis.indexedDB) throw new Error("This browser cannot retain original model files. Enable local browser storage and try again.");
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(MODEL_FILES_DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onerror = () => reject(new Error("Original files could not be opened in this browser."));
    request.onblocked = () => reject(new Error("Close other Print Farm tabs and try saving the model again."));
    request.onsuccess = () => resolve(request.result);
  });
}

async function transact(mode, operation) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      let result;
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = transaction.onerror = () => reject(new Error("This browser could not save or read the original files. Check available storage and try again."));
      try { operation(transaction.objectStore(STORE), value => { result = value; }); }
      catch (error) { transaction.abort(); reject(error); }
    });
  } finally { db.close(); }
}

export function jobAttachments(job) {
  if (Array.isArray(job?.attachments) && job.attachments.length) return job.attachments;
  if (job?.modelUrl) return [];
  return job?.fileName ? [{ id: "", name: job.fileName, sizeBytes: null }] : [];
}

export const modelFilesStore = {
  async save(files) {
    const records = Array.from(files, file => {
      const inspection = filesService.inspectSelection(file);
      if (!inspection.valid || !(file instanceof Blob)) throw new Error(inspection.error || "Choose the original model file again.");
      return { id: crypto.randomUUID(), name: file.name, sizeBytes: file.size, type: file.type,
        lastModified: file.lastModified || 0, blob: file.slice(0, file.size, file.type) };
    });
    await transact("readwrite", store => records.forEach(record => store.add(record)));
    return records.map(({ blob, ...metadata }) => metadata);
  },
  async get(id) {
    if (!id) return null;
    const record = await transact("readonly", (store, done) => {
      const request = store.get(id);
      request.onsuccess = () => done(request.result);
    });
    if (!record) return null;
    if (!(record.blob instanceof Blob) || record.blob.size !== record.sizeBytes || !record.blob.size) throw new Error("The saved original file is incomplete. It cannot be downloaded.");
    return new File([record.blob], record.name, { type: record.type, lastModified: record.lastModified });
  },
  async remove(ids) {
    if (!ids.length || !globalThis.indexedDB) return;
    await transact("readwrite", store => ids.forEach(id => store.delete(id)));
  },
  async clear() {
    if (!globalThis.indexedDB) return;
    await transact("readwrite", store => store.clear());
  },
};
