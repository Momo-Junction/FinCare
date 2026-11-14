export const sources = {
  registry: {
    name: "Finnish Cancer Registry · Breast screening annual statistics",
    url: "https://stats.cancerregistry.fi/joukkistilastot/breast.html",
  },
  strategy: {
    name: "National Cancer Strategy 2026–2035",
    url: "https://fican.fi/wp-content/uploads/2026/01/National_Cancer_Strategy_2026-2035_Finland.pdf",
  },
  roadmap: {
    name: "Implementation Roadmap 2026–2031",
    url: "https://stm.fi/documents/1271139/1359637/Kansallinen_syopastrategia_toimeenpanon_tiekartta_2026_2031.pdf/",
  },
} as const;

export const indicator = {
  year: 2024,
  definition: "Recorded attendees divided by people recorded as invited for programme mammography.",
  coverage: "Finland’s 21 wellbeing services counties and the City of Helsinki. Åland is excluded.",
  denominatorNote: "The Registry counts people selected for invitation. Some invitations may go unsent.",
  status: "2024 data (latest published final figures)",
} as const;

export const national = { invited: 344851, attended: 281369, rate: 81.6 };

// Published 2024 county table. Keep rates at the precision used by the Registry.
const rows = [
  ["central-finland", "Central Finland", 16537, 14073, 85.1],
  ["central-ostrobothnia", "Central Ostrobothnia", 3898, 3329, 85.4],
  ["central-uusimaa", "Central Uusimaa", 13592, 10944, 80.5],
  ["helsinki", "Helsinki", 38630, 28686, 74.3],
  ["east-uusimaa", "East Uusimaa", 6948, 5546, 79.8],
  ["kainuu", "Kainuu", 4798, 4033, 84.1],
  ["kanta-hame", "Kanta-Häme", 11355, 9467, 83.4],
  ["kymenlaakso", "Kymenlaakso", 11143, 9142, 82.0],
  ["lapland", "Lapland", 11548, 9678, 83.8],
  ["north-karelia", "North Karelia", 10619, 8940, 84.2],
  ["north-ostrobothnia", "North Ostrobothnia", 23560, 20168, 85.6],
  ["north-savo", "North Savo", 16191, 13785, 85.1],
  ["ostrobothnia", "Ostrobothnia", 9991, 8487, 84.9],
  ["pirkanmaa", "Pirkanmaa", 31677, 26449, 83.5],
  ["paijat-hame", "Päijät-Häme", 13832, 11313, 81.8],
  ["satakunta", "Satakunta", 14090, 11958, 84.9],
  ["south-karelia", "South Karelia", 8466, 7047, 83.2],
  ["south-ostrobothnia", "South Ostrobothnia", 11844, 10069, 85.0],
  ["south-savo", "South Savo", 9422, 7741, 82.2],
  ["southwest-finland", "Southwest Finland", 30614, 25331, 82.7],
  ["vantaa-kerava", "Vantaa and Kerava", 16057, 12323, 76.7],
  ["west-uusimaa", "West Uusimaa", 30039, 22860, 76.1],
] as const;

export const areas = rows.map(([id, name, invited, attended, rate]) => ({
  id, name, invited, attended, rate,
  gap: Number((rate - national.rate).toFixed(1)),
})).sort((left, right) => right.rate - left.rate || left.name.localeCompare(right.name));

export type Area = (typeof areas)[number];
