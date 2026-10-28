// Synthetic colours for visual QA only. Never imported by the application.
const colours = [
  ["White", "#FFFFFF"], ["Warm ivory", "#F5E6DB"], ["Silver", "#CFD1D2"], ["Graphite", "#545454"], ["Black", "#080808"],
  ["Scarlet", "#EE4B4B"], ["Terracotta", "#9B452E"], ["Orange", "#FF8C12"], ["Gold", "#E2B95F"], ["Yellow", "#F5EF31"],
  ["Lime", "#B8CF05"], ["Leaf green", "#3C9141"], ["Emerald", "#0DC33E"], ["Turquoise", "#00ADB5"], ["Sky blue", "#008ACD"],
  ["Ocean blue", "#0755B4"], ["Midnight", "#102A87"], ["Violet", "#6140B4"], ["Plum", "#4C2D61"], ["Pink", "#EE4780"],
];
export const paletteFixtures = ["PLA", "PETG", "TPU"].flatMap((material, materialIndex) => (
  colours.slice(0, [20, 10, 7][materialIndex]).map(([color, hexColor], index) => ({
    id: `qa-${material.toLowerCase()}-${index}`, material, color, hexColor,
    lowStock: index === 8 || index === 15, available: index !== 4,
  }))
));
