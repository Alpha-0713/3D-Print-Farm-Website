// Pure event projection used by the existing storage transaction.
import { JOB_LABELS } from "./jobWorkflow.js?v=2.2&rev=5";
export function projectInboxEvents(previous, next, actor, identities, roleFor) {
  const events = [];
  const supervisors = identities.filter((person) => roleFor(person.roleId)?.level === 4);
  const members = identities.filter((person) => [2, 3].includes(roleFor(person.roleId)?.level));
  const add = (people, event) => people.forEach((person) => events.push({ ...event, userId: person.id }));
  for (const job of next.jobs) {
    const old = previous.jobs.find((item) => item.id === job.id);
    const last = job.history.at(-1);
    const changed = !old || JSON.stringify(old.history) !== JSON.stringify(job.history);
    if (!changed) continue;
    const base = { jobId: job.id, context: job.projectName, createdAt: last?.at || job.submittedAt,
      authorizationId: job.printAuthorization?.id || null,
      eventKey: `job:${job.id}:${job.history.length}:${last?.type}`, actorId: actor.id, actorName: actor.name };
    if (!old && job.status === "SUBMITTED") add(supervisors, { ...base, kind: "initial-review", title: "New print request",
      summary: `${job.submitterName} requested ${job.projectName} · ${job.material} / ${job.color}.`, message: job.notes || "No additional notes." });
    if (old?.status !== job.status && job.status === "APPROVED") add(members, { ...base, kind: "available-job", title: "New job available",
      summary: `${job.projectName} · ${job.material} / ${job.color} is approved and available to claim.`, message: `Approved by ${actor.name}.` });
    if (old?.status !== job.status && job.status === "AWAITING_AUTHORIZATION") add(supervisors, { ...base, kind: "print-review", title: "Print authorization required",
      summary: `${job.assignedStaff} prepared ${job.projectName} and requested permission to print.`, message: "Current stage: Awaiting print authorization. Review preparation and model details before authorizing." });
    const assigned = members.find((person) => job.assignedStaffId ? job.assignedStaffId === person.id : job.assignedStaff === person.name);
    if (old && assigned && assigned.id !== actor.id) add([assigned], { ...base, kind: "job-progress",
      title: job.status === "AUTHORIZED" ? "Print authorized" : "Print progress updated",
      summary: `${job.projectName}: ${old.status !== job.status ? `${JOB_LABELS[old.status]} → ${JOB_LABELS[job.status]}` : "Job details updated"} by ${actor.name}.`,
      message: last?.note || (last?.type === "REASSIGNED" ? `Assigned to ${job.assignedStaff}.` : "Open the job for its current progress and details.") });
    if (old?.status !== job.status && job.status === "REJECTED" && job.submitterId) add(identities.filter((person) => person.id === job.submitterId),
      { ...base, kind: "request-decision", title: "Print request rejected", summary: `${job.projectName} was rejected by ${actor.name}.`, message: job.initialApproval.reason });
  }
  for (const request of next.hours.requests) {
    if (previous.hours.requests.some((item) => item.id === request.id)) continue;
    add(supervisors, { kind: "hours-review", requestId: request.id, requesterId: request.requesterId,
      eventKey: `hours-request:${request.id}`, context: request.requesterName, createdAt: request.submittedAt,
      title: "Hours approval requested", summary: `${request.requesterName} requested ${request.adjustmentType === "add" ? "+" : "−"}${request.hoursCenti / 100} hours.`, message: request.reason });
  }
  for (const transaction of next.hours.transactions) {
    if (transaction.deltaCenti <= 0 || previous.hours.transactions.some((item) => item.id === transaction.id)) continue;
    const person = members.find((item) => item.id === transaction.userId);
    if (!person) continue;
    add([person], { kind: "hours-added", requestId: transaction.requestId, eventKey: `hours-added:${transaction.id}`,
      context: person.name, createdAt: transaction.createdAt, title: "Hours added",
      summary: `${transaction.deltaCenti / 100} hours added · updated total ${transaction.balanceAfterCenti / 100} hours.`, message: `${transaction.reason} · Recorded by ${transaction.actorName}.` });
  }
  // Rejections and deductions should also give the requester a useful decision record.
  for (const request of next.hours.requests) {
    const old = previous.hours.requests.find((item) => item.id === request.id);
    if (old?.status !== "Pending" || request.status === "Pending" || (request.status === "Approved" && request.adjustmentType === "add")) continue;
    add(identities.filter((person) => person.id === request.requesterId), { kind: "hours-decision", requestId: request.id,
      eventKey: `hours-decision:${request.id}`, context: request.requesterName, createdAt: request.decidedAt,
      title: `Hours request ${request.status.toLowerCase()}`, summary: `${request.reviewedByName} ${request.status.toLowerCase()} your ${request.hoursCenti / 100} hour request.`, message: request.rejectionReason || request.reason });
  }
  return events;
}
