export function jobAttachments(job) {
  if (Array.isArray(job?.attachments) && job.attachments.length) return job.attachments;
  if (job?.modelUrl) return [];
  return job?.fileName ? [{ id: "", name: job.fileName, sizeBytes: null, legacy: true }] : [];
}
