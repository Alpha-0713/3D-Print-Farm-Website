import { getRole, hasPermission } from "./authorization.js?v=14";

export const DEMO_ROLE_STORAGE_KEY = "three-d-print-farm-demo-role";
export const DEFAULT_DEMO_ROLE_ID = "regular_teacher";

const DEMO_IDENTITIES = Object.freeze([
  Object.freeze({ id: "demo-person-01", name: "Mr. Q", email: "mr.q@example.com", roleId: "regular_teacher", authenticationMode: "demo" }),
  Object.freeze({ id: "demo-person-02", name: "Leddy Tiang", email: "leddy.tiang@example.com", roleId: "print_farm_member", authenticationMode: "demo" }),
  Object.freeze({ id: "demo-person-03", name: "Darry Hing", email: "fayren.ju@example.com", roleId: "senior_print_farm_member", authenticationMode: "demo" }),
  Object.freeze({ id: "demo-person-04", name: "Mr. Uw", email: "mr.uw@example.com", roleId: "print_farm_teacher", authenticationMode: "demo" }),
]);

let inMemoryRoleId = DEFAULT_DEMO_ROLE_ID;

function identityForRole(roleId) {
  const identity = DEMO_IDENTITIES.find((item) => item.roleId === roleId);
  return identity ? { ...identity } : { ...DEMO_IDENTITIES[0] };
}

function activeRoleId() {
  try {
    const saved = localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
    if (getRole(saved)) return saved;
  } catch {
    // The current demo identity remains available when browser storage is blocked.
  }
  return inMemoryRoleId;
}

export const authService = {
  mode: "demo",
  getActiveRoleId: activeRoleId,
  getCurrentRole() {
    return getRole(activeRoleId());
  },
  getCurrentIdentity() {
    return identityForRole(activeRoleId());
  },
  getDemoIdentities() {
    return DEMO_IDENTITIES.map((identity) => ({ ...identity }));
  },
  can(permission) {
    return hasPermission(activeRoleId(), permission);
  },
  switchRole(roleId) {
    if (!getRole(roleId) || !DEMO_IDENTITIES.some((identity) => identity.roleId === roleId)) return false;
    inMemoryRoleId = roleId;
    try {
      localStorage.setItem(DEMO_ROLE_STORAGE_KEY, roleId);
    } catch {
      // The switch still applies for this page session when browser storage is blocked.
    }
    return true;
  },
};
