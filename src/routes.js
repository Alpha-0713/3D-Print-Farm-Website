export function parseRoute(hash) {
  const value = (hash?.replace(/^#/, "") || "/").split("?")[0];
  const bad = { page: "not-found" };
  const decode = raw => { try { const text = decodeURIComponent(raw); return text && !/[\/#?\x00-\x1f]/.test(text) ? text : null; } catch { return null; } };
  const section = value.match(/^\/section\/([^/?#]+)$/);
  if (section) { const name = decode(section[1]); return ["faq", "printers"].includes(name) ? { page: "home", section: name } : bad; }
  if (["/printers", "/faq"].includes(value)) return { page: "home", section: value.slice(1) };
  const fixed = { "/": "home", "/get-started": "get-started", "/my-jobs": "my-jobs", "/staff": "staff", "/staff/": "staff", "/staff/jobs": "jobs", "/staff/active": "active", "/staff/materials": "materials", "/staff/materials/new": "material-new", "/staff/hours": "hours", "/staff/contributions": "hours" };
  if (fixed[value]) return { page: fixed[value] };
  if (value === "/staff/queue") return { page: "staff", redirect: true };
  for (const [pattern, page, key] of [[/^\/staff\/jobs\/([^/?#]+)$/, "job", "id"], [/^\/my-jobs\/([^/?#]+)$/, "my-job", "id"], [/^\/staff\/materials\/([^/?#]+)$/, "filament", "id"], [/^\/staff\/hours\/staff\/([^/?#]+)$/, "hours", "staffId"]]) {
    const match = value.match(pattern);
    if (match) { const decoded = decode(match[1]); return decoded ? { page, [key]: decoded } : bad; }
  }
  return bad;
}
