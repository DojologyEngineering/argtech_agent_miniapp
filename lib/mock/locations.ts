/** Trimmed Cambodian administrative tree — enough for realistic cascading selects. */
export interface CommuneNode {
  name: string;
  villages: string[];
}
export interface DistrictNode {
  name: string;
  communes: CommuneNode[];
}
export interface ProvinceNode {
  name: string;
  districts: DistrictNode[];
}

export const PROVINCES: ProvinceNode[] = [
  {
    name: "Siem Reap",
    districts: [
      {
        name: "Siem Reap City",
        communes: [
          { name: "Wat Bo", villages: ["Wat Bo", "Trang", "Stung Thmey"] },
          { name: "Svay Dangkum", villages: ["Mondul I", "Mondul II", "Vihear Chen"] },
        ],
      },
      {
        name: "Puok",
        communes: [
          { name: "Puok", villages: ["Puok Krom", "Puok Leu", "Kandaek"] },
          { name: "Kandek", villages: ["Kandek", "Thnal Bek"] },
        ],
      },
    ],
  },
  {
    name: "Battambang",
    districts: [
      {
        name: "Battambang City",
        communes: [
          { name: "Svay Por", villages: ["Kammeakkar", "Romchek IV", "Prek Mohatep"] },
          { name: "Tuol Ta Ek", villages: ["Tuol Ta Ek", "Chamkar Samsep"] },
        ],
      },
      {
        name: "Ek Phnom",
        communes: [{ name: "Peam Aek", villages: ["Peam Aek", "Kaoh Chiveang"] }],
      },
    ],
  },
  {
    name: "Kampong Thom",
    districts: [
      {
        name: "Stueng Saen",
        communes: [
          { name: "Damrei Choan Khla", villages: ["Kampong Thom", "Achar Leak"] },
          { name: "Kampong Roteh", villages: ["Kampong Roteh", "Ta Ches"] },
        ],
      },
    ],
  },
  {
    name: "Prey Veng",
    districts: [
      {
        name: "Ba Phnum",
        communes: [{ name: "Cheung Phnom", villages: ["Cheung Phnom", "Ampil Ta Pok"] }],
      },
    ],
  },
  {
    name: "Kampot",
    districts: [
      {
        name: "Tuek Chhou",
        communes: [{ name: "Trapeang Sangkae", villages: ["Trapeang Sangkae", "Kandal"] }],
      },
    ],
  },
];

export const PROVINCE_NAMES = PROVINCES.map((p) => p.name);

export function districtsOf(province: string) {
  return PROVINCES.find((p) => p.name === province)?.districts ?? [];
}
export function communesOf(province: string, district: string) {
  return districtsOf(province).find((d) => d.name === district)?.communes ?? [];
}
export function villagesOf(province: string, district: string, commune: string) {
  return communesOf(province, district).find((c) => c.name === commune)?.villages ?? [];
}
