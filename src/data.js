export const MATERIALS = [
  {
    id: "PLA",
    name: "PLA",
    descriptor: "The everyday starting point",
    description: "PLA is a widely used, plant-derived thermoplastic that is usually straightforward to print. It is rigid and holds detail well, making it a practical choice for classroom models, display pieces, and early prototypes. It can be more brittle and softens at lower temperatures than PETG, so it is less suited to hot environments or parts that must flex.",
    uses: "Classroom models · Display pieces · Early prototypes",
    considerations: "Usually the easiest of these materials to print; avoid sustained heat and repeated bending.",
  },
  {
    id: "PETG",
    name: "PETG",
    descriptor: "For functional ideas",
    description: "PETG is a tough thermoplastic that often bends or yields more before breaking than PLA. It is useful for functional prototypes, brackets, and enclosures that need more impact resistance. It can string during printing and still softens with heat; staff should check the design and printer setup.",
    uses: "Brackets · Enclosures · Functional prototypes",
    considerations: "Can string more than PLA and needs suitable printer settings; not a substitute for a certified load-bearing part.",
  },
  {
    id: "TPU",
    name: "TPU",
    descriptor: "A little more give",
    description: "TPU is a flexible thermoplastic elastomer. It can make parts that bend and recover, such as grips, bumpers, and protective covers. Its flexibility depends on the specific filament and design, and it is generally slower and more demanding to print than PLA.",
    uses: "Grips · Bumpers · Flexible covers",
    considerations: "Needs a compatible printer and careful, usually slower printing; staff should confirm that the design suits a flexible material.",
  },
];

export const LAYER_HEIGHTS = ["0.12 mm", "0.20 mm", "0.28 mm"];
export const STATUSES = ["SUBMITTED", "IN_PROGRESS", "PRINTING", "COMPLETED"];

const now = Date.now();
const isoDaysAgo = (days, hours = 10) => {
  const date = new Date(now);
  date.setDate(date.getDate() - days);
  date.setHours(hours, 0, 0, 0);
  return date.toISOString();
};
const history = (submittedAt, status, staff, completedAt = null) => {
  const events = [{ type: "SUBMITTED", at: submittedAt, by: "Student" }];
  if (["IN_PROGRESS", "PRINTING", "COMPLETED"].includes(status)) events.push({ type: "CLAIMED", at: new Date(new Date(submittedAt).getTime() + 3600000).toISOString(), by: staff });
  if (["PRINTING", "COMPLETED"].includes(status)) events.push({ type: "PRINTING", at: new Date(new Date(submittedAt).getTime() + 7200000).toISOString(), by: staff });
  if (status === "COMPLETED") events.push({ type: "COMPLETED", at: completedAt || isoDaysAgo(0, 8), by: staff });
  return events;
};

const seedRows = [
  ["PF-2601", "Sensor mount · Rev C", "Avery Chen", "avery@example.com", "sensor-mount.stl", "PLA", "Green", "SUBMITTED", null, 0],
  ["PF-2602", "Pump housing · Rev B", "Morgan Lee", "morgan@example.com", "pump-housing.3mf", "PETG", "Black", "IN_PROGRESS", "Leddy Tiang", 1],
  ["PF-2603", "Assembly nest · Rev A", "Riley Patel", "riley@example.com", "assembly-nest.stl", "PLA", "Gray", "IN_PROGRESS", "Leddy Tiang", 1],
  ["PF-2604", "Cable guide · Rev D", "Noah Kim", "noah@example.com", "cable-guide.3mf", "TPU", "Black", "PRINTING", "Leddy Tiang", 2],
  ["PF-2605", "Display stand · Rev A", "Sam Rivera", "sam@example.com", "display-stand.stl", "PLA", "White", "SUBMITTED", null, 0],
  ["PF-2606", "Enclosure base · Rev C", "Taylor Brooks", "taylor@example.com", "enclosure-base.3mf", "PETG", "Gray", "PRINTING", "Leddy Tiang", 3],
  ["PF-2607", "Optical lens jig · Rev B", "Jamie Park", "jamie@example.com", "lens-jig.stl", "PLA", "Black", "SUBMITTED", null, 1],
  ["PF-2608", "Air duct clip · Rev E", "Casey Nguyen", "casey@example.com", "air-duct-clip.3mf", "TPU", "Blue", "COMPLETED", "Leddy Tiang", 1],
  ["PF-2609", "Camera bracket · Rev A", "Alex Morgan", "alex@example.com", "camera-bracket.stl", "PETG", "Gray", "SUBMITTED", null, 2],
  ["PF-2610", "Lab tray insert · Rev B", "Quinn Davis", "quinn@example.com", "tray-insert.3mf", "PLA", "Green", "COMPLETED", "Leddy Tiang", 2],
  ["PF-2611", "Protective foot · Rev A", "Harper Singh", "harper@example.com", "protective-foot.stl", "TPU", "Black", "IN_PROGRESS", "Leddy Tiang", 0],
  ["PF-2612", "Prototype enclosure · Rev F", "Student Demo", "student@example.com", "prototype-enclosure.stl", "PETG", "White", "SUBMITTED", null, 0],
  ["PF-2613", "Desk organizer · Rev A", "Student Demo", "student@example.com", "desk-organizer.3mf", "PLA", "Blue", "COMPLETED", "Leddy Tiang", 5],
  ["PF-2614", "Flex hinge test · Rev B", "Drew Wilson", "drew@example.com", "flex-hinge.stl", "TPU", "Red", "PRINTING", "Leddy Tiang", 1],
];

export const MOCK_JOBS = seedRows.map(([id, projectName, submitterName, recipientEmail, fileName, material, color, status, assignedStaff, daysAgo], index) => {
  const submittedAt = isoDaysAgo(daysAgo, 9 + (index % 7));
  const completedAt = status === "COMPLETED" ? isoDaysAgo(index === 9 ? 0 : 1, 8 + (index % 5)) : null;
  return {
    id, projectName, submitterName, submitterEmail: recipientEmail, recipientEmail, fileName,
    fileSize: (1.2 + index * 0.37).toFixed(1) + " MB", material, color,
    layerHeight: LAYER_HEIGHTS[index % LAYER_HEIGHTS.length], infill: [20, 35, 15, 50][index % 4],
    purpose: ["Class project", "Functional prototype", "Personal project", "Engineering design"][index % 4],
    notes: index % 3 === 0 ? "Please check the orientation before printing." : "",
    submittedAt, status, assignedStaff, pickupLocation: status === "COMPLETED" ? "School office · demo pickup" : null,
    completedAt, history: history(submittedAt, status, assignedStaff || "Leddy Tiang", completedAt),
  };
});

export const MOCK_NOTIFICATIONS = [
  {
    id: "NT-1001", jobId: "PF-2608", recipientEmail: "casey@example.com", pickupLocation: "School office · demo pickup",
    subject: "Your 3D print is ready for pickup", status: "FAILED", createdAt: isoDaysAgo(1, 8), simulated: true,
  },
];

export const DEMO_STUDENT = { name: "Student Demo", email: "student@example.com", mode: "Mock student identity" };
export const DEMO_STAFF = { name: "Leddy Tiang", role: "Print Farm Staff", mode: "Mock staff identity" };
