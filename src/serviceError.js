export class ServiceError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    Object.assign(this, details);
  }
}
export function validation(condition, message, field) {
  if (!condition) throw new ServiceError("validation", message, { field });
}
export function errorMessage(error) {
  const guidance = {
    permission_denied: "Your account does not have permission for this operation.",
    expired_session: "Your session expired. Reload to check your session before continuing.",
    network_error: "The server could not be reached. Your change is unconfirmed. Retry with the same form.",
    conflict: "This record changed. Refresh and review the latest details before trying again.",
  };
  return guidance[error?.code] || error?.message || "The operation could not be completed.";
}
