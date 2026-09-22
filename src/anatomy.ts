export const sources = {
  liver: {
    label: "Johns Hopkins Medicine · Liver anatomy",
    url: "https://www.hopkinsmedicine.org/health/conditions-and-diseases/liver-anatomy-and-functions",
  },
  digestion: {
    label: "NIDDK · Your digestive system",
    url: "https://www.niddk.nih.gov/health-information/digestive-diseases/digestive-system-how-it-works",
  },
  biliary: {
    label: "Johns Hopkins Medicine · Biliary system",
    url: "https://www.hopkinsmedicine.org/health/conditions-and-diseases/biliary-system-anatomy-and-functions",
  },
  veins: {
    label: "NCI SEER · Human anatomy, p. 112",
    url: "https://seer.cancer.gov/training/manuals/Book4.pdf",
  },
};
export const structures = [
  {
    id: "liver",
    name: "Liver surface",
    category: "Organ",
    color: "#a85750",
    fma: "FMA7197",
    sourceName: "liver (tissue subset)",
    mapping: "isa",
    concepts: [
      "FMA13365",
      "FMA15739",
      "FMA15741",
      "FMA15742",
      "FMA15743",
      "FMA15744",
      "FMA15745",
      "FMA15746",
    ],
    description:
      "The liver processes nutrients, stores energy, and makes bile to help digest fats. It sits beneath the diaphragm, mostly on the right side of the abdomen.",
    note: "Source tissue pieces are displayed together. Lobes and functional segments are not individually labeled or selectable.",
    source: "liver",
  },
  {
    id: "gallbladder",
    name: "Gallbladder",
    category: "Biliary",
    color: "#86a65f",
    fma: "FMA7202",
    sourceName: "gallbladder",
    mapping: "partof",
    concepts: ["FMA7202"],
    description:
      "A small organ beneath the liver that stores bile between meals and releases it into the small intestine to support fat digestion.",
    note: "Use the inferior view to see its relationship to the underside of the liver.",
    source: "digestion",
  },
  {
    id: "portal",
    name: "Portal vein",
    category: "Vessel",
    color: "#9783c1",
    fma: "FMA50735",
    sourceName: "hepatic portal vein",
    mapping: "partof",
    concepts: ["FMA50735"],
    description:
      "The hepatic portal vein brings nutrient-rich blood to the liver from the digestive organs. Its branches distribute this blood through the liver.",
    note: "A grouped source vessel tree. Branches and cut ends are simplified; blood flow is not simulated.",
    source: "liver",
  },
  {
    id: "hepatic-veins",
    name: "Hepatic veins",
    category: "Vessel",
    color: "#649cbb",
    fma: "FMA14337",
    sourceName: "hepatic vein and tributary of hepatic vein",
    mapping: "isa",
    concepts: ["FMA14337", "FMA17541"],
    description:
      "The hepatic veins carry blood away from the liver toward the inferior vena cava, returning it to the circulation.",
    note: "Three main hepatic veins and mapped tributaries are grouped together. The inferior vena cava is not included.",
    source: "veins",
  },
  {
    id: "artery",
    name: "Hepatic artery",
    category: "Vessel",
    color: "#d99173",
    fma: "FMA14772",
    sourceName: "hepatic artery proper",
    mapping: "partof",
    concepts: ["FMA14772"],
    description:
      "The hepatic artery supplies oxygenated blood to the liver, alongside the nutrient-rich blood arriving through the portal vein.",
    note: "The proper hepatic artery and its mapped branches are included. The upstream common hepatic artery is omitted.",
    source: "liver",
  },
  {
    id: "biliary",
    name: "Hepatic bile ducts",
    category: "Biliary",
    color: "#b1a450",
    fma: "FMA71891",
    sourceName: "hepatic biliary tree",
    mapping: "partof",
    concepts: ["FMA71891"],
    description:
      "A branching network collects bile from the liver. The right and left hepatic ducts join the common hepatic duct.",
    note: "Includes the common hepatic duct. The downstream common bile duct and intestine are not part of this model.",
    source: "biliary",
  },
  {
    id: "cystic",
    name: "Cystic duct",
    category: "Biliary",
    color: "#6b9d83",
    fma: "FMA14539",
    sourceName: "cystic duct",
    mapping: "partof",
    concepts: ["FMA14539"],
    description:
      "The cystic duct connects the gallbladder with the bile duct system, providing a passage for stored bile.",
    note: "A short, separately mapped duct. Isolate it or hide the liver surface for a clearer view.",
    source: "biliary",
  },
] as const;
export type StructureId = (typeof structures)[number]["id"];
export type ViewName =
  "Overview" | "Anterior" | "Posterior" | "Inferior" | "Superior";
export const views: ViewName[] = [
  "Overview",
  "Anterior",
  "Posterior",
  "Inferior",
  "Superior",
];
export const tour = [
  {
    title: "Start with the whole organ",
    text: "Rotate the liver to explore its broad surface. The source tissue is combined into one selection, without implying clinically reviewed segment boundaries.",
    selected: "liver",
    view: "Overview",
    reveal: false,
  },
  {
    title: "Look beneath the liver",
    text: "The gallbladder rests against the underside of the liver. The inferior view brings this small bile reservoir into view.",
    selected: "gallbladder",
    view: "Inferior",
    reveal: false,
  },
  {
    title: "Two blood supplies",
    text: "Reveal the interior to find the portal vein in violet and the hepatic artery in terracotta. They bring blood to the liver from different sources.",
    selected: "portal",
    view: "Anterior",
    reveal: true,
  },
  {
    title: "Follow the biliary branches",
    text: "The ochre ducts collect bile from the liver. Select the cystic duct to see the connection toward the gallbladder. This is a static anatomical model.",
    selected: "biliary",
    view: "Inferior",
    reveal: true,
  },
] satisfies {
  title: string;
  text: string;
  selected: StructureId;
  view: ViewName;
  reveal: boolean;
}[];
