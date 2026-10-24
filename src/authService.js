import { DEMO_STAFF, DEMO_STUDENT } from "./data.js?v=13";

export const authService = {
  mode: "mock",
  async getStudent() { return { ...DEMO_STUDENT }; },
  async getStaff() { return { ...DEMO_STAFF }; },
  async getCurrentIdentity(role = "student") { return role === "staff" ? this.getStaff() : this.getStudent(); },
};
