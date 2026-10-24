export const PERMISSIONS = Object.freeze({
  PRINT_REQUEST_CREATE: "print_request.create",
  MY_JOBS_VIEW: "my_jobs.view",
  STAFF_DASHBOARD_VIEW: "staff_dashboard.view",
  JOBS_MANAGE: "jobs.manage",
  JOBS_REASSIGN: "jobs.reassign",
  CONTRIBUTIONS_MANAGE: "contributions.manage",
  FILAMENT_VIEW: "filament.view",
  FILAMENT_CHANGE: "filament.change",
  NOTIFICATIONS_RETRY: "notifications.retry",
});

export const ROLES = Object.freeze({
  regular_teacher: Object.freeze({
    id: "regular_teacher",
    title: "Regular School Teacher",
    level: 1,
    inherits: [],
    permissions: [PERMISSIONS.PRINT_REQUEST_CREATE, PERMISSIONS.MY_JOBS_VIEW],
  }),
  print_farm_member: Object.freeze({
    id: "print_farm_member",
    title: "Print Farm Member",
    level: 2,
    inherits: ["regular_teacher"],
    permissions: [
      PERMISSIONS.STAFF_DASHBOARD_VIEW,
      PERMISSIONS.JOBS_MANAGE,
      PERMISSIONS.CONTRIBUTIONS_MANAGE,
      PERMISSIONS.FILAMENT_VIEW,
      PERMISSIONS.NOTIFICATIONS_RETRY,
    ],
  }),
  senior_print_farm_member: Object.freeze({
    id: "senior_print_farm_member",
    title: "Senior Print Farm Member",
    level: 3,
    inherits: ["print_farm_member"],
    permissions: [PERMISSIONS.FILAMENT_CHANGE],
  }),
  print_farm_teacher: Object.freeze({
    id: "print_farm_teacher",
    title: "Print Farm Teacher",
    level: 4,
    inherits: ["senior_print_farm_member"],
    permissions: [PERMISSIONS.JOBS_REASSIGN],
  }),
});

export function getRole(roleId) {
  return ROLES[roleId] || null;
}

export function getPermissions(roleId) {
  const role = getRole(roleId);
  if (!role) return new Set();

  const permissions = new Set(role.permissions);
  for (const inheritedRoleId of role.inherits) {
    for (const permission of getPermissions(inheritedRoleId)) permissions.add(permission);
  }
  return permissions;
}

export function hasPermission(roleId, permission) {
  return getPermissions(roleId).has(permission);
}

export const ROUTE_PERMISSIONS = Object.freeze({
  "get-started": PERMISSIONS.PRINT_REQUEST_CREATE,
  "my-jobs": PERMISSIONS.MY_JOBS_VIEW,
  staff: PERMISSIONS.STAFF_DASHBOARD_VIEW,
  active: PERMISSIONS.STAFF_DASHBOARD_VIEW,
  materials: PERMISSIONS.STAFF_DASHBOARD_VIEW,
  "material-new": PERMISSIONS.FILAMENT_CHANGE,
  filament: PERMISSIONS.FILAMENT_VIEW,
  hours: PERMISSIONS.STAFF_DASHBOARD_VIEW,
  job: PERMISSIONS.STAFF_DASHBOARD_VIEW,
});

export const ACTION_PERMISSIONS = Object.freeze({
  "wizard-next": PERMISSIONS.PRINT_REQUEST_CREATE,
  "wizard-back": PERMISSIONS.PRINT_REQUEST_CREATE,
  "wizard-goto": PERMISSIONS.PRINT_REQUEST_CREATE,
  "remove-file": PERMISSIONS.PRINT_REQUEST_CREATE,
  "save-draft": PERMISSIONS.PRINT_REQUEST_CREATE,
  "discard-draft": PERMISSIONS.PRINT_REQUEST_CREATE,
  "submit-request": PERMISSIONS.PRINT_REQUEST_CREATE,
  "new-request": PERMISSIONS.PRINT_REQUEST_CREATE,
  "inventory-toggle": PERMISSIONS.FILAMENT_CHANGE,
  "claim-job": PERMISSIONS.JOBS_MANAGE,
  "start-printing": PERMISSIONS.JOBS_MANAGE,
  "complete-job": PERMISSIONS.JOBS_MANAGE,
  "retry-notification": PERMISSIONS.NOTIFICATIONS_RETRY,
  "hours-edit": PERMISSIONS.CONTRIBUTIONS_MANAGE,
  "hours-cancel-edit": PERMISSIONS.CONTRIBUTIONS_MANAGE,
  "hours-clear-filters": PERMISSIONS.STAFF_DASHBOARD_VIEW,
  "copy-job": PERMISSIONS.STAFF_DASHBOARD_VIEW,
});

export const FORM_PERMISSIONS = Object.freeze({
  "model-link": PERMISSIONS.PRINT_REQUEST_CREATE,
  "hours-filter": PERMISSIONS.STAFF_DASHBOARD_VIEW,
  "inventory-add": PERMISSIONS.FILAMENT_CHANGE,
  "inventory-update": PERMISSIONS.FILAMENT_CHANGE,
  "inventory-adjust": PERMISSIONS.FILAMENT_CHANGE,
  "hours-add": PERMISSIONS.CONTRIBUTIONS_MANAGE,
  "hours-update": PERMISSIONS.CONTRIBUTIONS_MANAGE,
  "job-reassign": PERMISSIONS.JOBS_REASSIGN,
});

export const PERMISSION_LABELS = Object.freeze({
  [PERMISSIONS.PRINT_REQUEST_CREATE]: "submitting print requests",
  [PERMISSIONS.MY_JOBS_VIEW]: "viewing your print requests",
  [PERMISSIONS.STAFF_DASHBOARD_VIEW]: "opening the Staff Dashboard",
  [PERMISSIONS.JOBS_MANAGE]: "managing print jobs",
  [PERMISSIONS.JOBS_REASSIGN]: "reassigning print jobs",
  [PERMISSIONS.CONTRIBUTIONS_MANAGE]: "managing contribution records",
  [PERMISSIONS.FILAMENT_VIEW]: "viewing filament details",
  [PERMISSIONS.FILAMENT_CHANGE]: "changing filament records and stock",
  [PERMISSIONS.NOTIFICATIONS_RETRY]: "retrying simulated notifications",
});
