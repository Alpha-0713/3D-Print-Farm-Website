// Shared workflow vocabulary. Services enforce transitions; all views use these labels.
export const JOB_LABELS = Object.freeze({
  SUBMITTED: "Pending supervisor review", APPROVED: "Approved / available",
  IN_PROGRESS: "Preparation", AWAITING_AUTHORIZATION: "Awaiting print authorization",
  AUTHORIZED: "Authorized to print", PRINTING: "Printing", COMPLETED: "Ready for pickup",
  COLLECTED: "Collected", CANCELLED: "Cancelled", REJECTED: "Rejected",
});
export const isAssignedTo = (job, identity) => job.assignedStaffId
  ? job.assignedStaffId === identity.id : job.assignedStaff === identity.name;
export const initiallyApproved = (job) => job.initialApproval?.decision === "approved"
  || job.initialApproval?.legacy === true;
export const staffCanSeeJob = (job, supervisor) => supervisor || initiallyApproved(job);
export const claimable = (job) => job.status === "APPROVED" && initiallyApproved(job) && !job.assignedStaff;
