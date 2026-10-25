import { getRole, hasPermission } from "./authorization.js?v=20";

export const DEMO_ROLE_STORAGE_KEY = "three-d-print-farm-demo-role";
export const DEMO_ACCOUNTS_STORAGE_KEY = "three-d-print-farm-demo-accounts";
export const DEFAULT_DEMO_ROLE_ID = "regular_teacher";
const DEFAULT_DEMO_IDENTITY_ID = "demo-person-01";

const BUILT_IN_IDENTITIES = Object.freeze([
  Object.freeze({ id: "demo-person-01", name: "Mr. Q", email: "mr.q@example.com", roleId: "regular_teacher", authenticationMode: "demo" }),
  Object.freeze({ id: "demo-person-02", name: "Leddy Tiang", email: "leddy.tiang@example.com", roleId: "print_farm_member", authenticationMode: "demo" }),
  Object.freeze({ id: "demo-person-03", name: "Darry Hing", email: "darry.hing@example.com", roleId: "senior_print_farm_member", authenticationMode: "demo" }),
  Object.freeze({ id: "demo-person-04", name: "Mr. Uw", email: "mr.uw@example.com", roleId: "print_farm_teacher", authenticationMode: "demo" }),
  Object.freeze({ id: "demo-person-05", name: "Whunder Tar", email: "whunder.tar@example.com", roleId: "print_farm_member", authenticationMode: "demo" }),
  Object.freeze({ id: "demo-person-06", name: "Fayren Ju", email: "fayren.ju@example.com", roleId: "senior_print_farm_member", authenticationMode: "demo" }),
]);

let inMemoryIdentityId = DEFAULT_DEMO_IDENTITY_ID;
let inMemoryCustomAccounts = [];

function isDemoAccount(value) {
  return value !== null
    && typeof value === "object"
    && typeof value.id === "string"
    && typeof value.name === "string"
    && typeof value.email === "string"
    && typeof value.roleId === "string"
    && Boolean(getRole(value.roleId));
}

function customAccounts() {
  try {
    const raw = localStorage.getItem(DEMO_ACCOUNTS_STORAGE_KEY);
    if (!raw) return inMemoryCustomAccounts.map((identity) => ({ ...identity }));
    const stored = JSON.parse(raw);
    if (!Array.isArray(stored)) return inMemoryCustomAccounts.map((identity) => ({ ...identity }));
    return stored.filter(isDemoAccount).map((identity) => ({ ...identity }));
  } catch {
    return inMemoryCustomAccounts.map((identity) => ({ ...identity }));
  }
}

function demoIdentities() {
  const builtInIds = new Set(BUILT_IN_IDENTITIES.map((identity) => identity.id));
  const custom = customAccounts().filter((identity) => !builtInIds.has(identity.id));
  return [...BUILT_IN_IDENTITIES.map((identity) => ({ ...identity })), ...custom]
    .sort((a, b) => getRole(a.roleId).level - getRole(b.roleId).level || a.name.localeCompare(b.name));
}

function identityForSelection(selection) {
  const identities = demoIdentities();
  return identities.find((identity) => identity.id === selection)
    || identities.find((identity) => identity.roleId === selection)
    || identities.find((identity) => identity.id === DEFAULT_DEMO_IDENTITY_ID);
}

function activeIdentity() {
  try {
    const saved = localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
    if (saved) {
      const identities = demoIdentities();
      const selected = identities.find((identity) => identity.id === saved)
        || (getRole(saved) ? identities.find((identity) => identity.roleId === saved) : null);
      if (selected) return selected;
    }
  } catch {
    // The current demo identity remains available when browser storage is blocked.
  }
  return identityForSelection(inMemoryIdentityId);
}

function activeRoleId() {
  return activeIdentity().roleId;
}

export const authService = {
  mode: "demo",
  getActiveRoleId: activeRoleId,
  getCurrentRole() {
    return getRole(activeRoleId());
  },
  getCurrentIdentity() {
    return { ...activeIdentity() };
  },
  getDemoIdentities() {
    return demoIdentities();
  },
  can(permission) {
    return hasPermission(activeRoleId(), permission);
  },
  switchRole(identityIdOrRoleId) {
    const identity = identityForSelection(identityIdOrRoleId);
    if (!identity || (identity.id !== identityIdOrRoleId && identity.roleId !== identityIdOrRoleId)) return false;
    inMemoryIdentityId = identity.id;
    try {
      localStorage.setItem(DEMO_ROLE_STORAGE_KEY, identity.id);
    } catch {
      // The switch still applies for this page session when browser storage is blocked.
    }
    return true;
  },
  createDemoAccount(payload = {}) {
    const name = String(payload.name || "").trim().replace(/\s+/g, " ");
    const roleId = String(payload.roleId || "");
    if (name.length < 2 || name.length > 80) throw new Error("Enter a name between 2 and 80 characters.");
    if (!getRole(roleId)) throw new Error("Choose a valid access level.");

    const existing = demoIdentities();
    if (existing.some((identity) => identity.name.toLowerCase() === name.toLowerCase())) {
      throw new Error("An account with that name already exists. Choose a different name.");
    }

    const nextNumber = existing.reduce((max, identity) => {
      const match = identity.id.match(/^demo-person-(\d+)$/);
      return match ? Math.max(max, Number(match[1])) : max;
    }, 0) + 1;
    const suffix = String(nextNumber).padStart(2, "0");
    const account = {
      id: `demo-person-${suffix}`,
      name,
      email: `demo.person.${suffix}@example.com`,
      roleId,
      authenticationMode: "demo",
    };
    const nextAccounts = [...customAccounts(), account];
    inMemoryCustomAccounts = nextAccounts.map((identity) => ({ ...identity }));
    try {
      localStorage.setItem(DEMO_ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts));
    } catch {
      // Keep the account available for this page session if browser storage is blocked.
    }
    return { ...account };
  },
};
