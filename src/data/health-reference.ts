export const HEALTH_REFERENCE_URL =
  "https://www.mohfw.gov.in/sites/default/files/Final%20Printed%20English%20AR%202024-25.pdf";
export const HPV_REFERENCE_URL =
  "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2233906&lang=1&reg=3";
export type VaccineReference = {
  id: string;
  title: string;
  when: string;
  note: string;
};
const group = (
  age: string,
  items: [string, string][],
  note = "",
): VaccineReference[] =>
  items.map(([id, title]) => ({ id, title, when: age, note }));
export const vaccines: VaccineReference[] = [
  ...group(
    "At birth",
    [
      ["bcg", "Tuberculosis (BCG)"],
      ["opv0", "Polio · birth dose"],
      ["hepb0", "Hepatitis B · birth dose"],
    ],
    "Check timing with the birth team; the hepatitis B birth dose is time-sensitive.",
  ),
  ...group("6 weeks", [
    ["opv1", "Polio drops · dose 1"],
    ["penta1", "Five-in-one (pentavalent) · dose 1"],
    ["rvv1", "Rotavirus · dose 1"],
    ["fipv1", "Polio injection (fIPV) · dose 1"],
    ["pcv1", "Pneumococcal (PCV) · dose 1"],
  ]),
  ...group("10 weeks", [
    ["opv2", "Polio drops · dose 2"],
    ["penta2", "Five-in-one (pentavalent) · dose 2"],
    ["rvv2", "Rotavirus · dose 2"],
  ]),
  ...group("14 weeks", [
    ["opv3", "Polio drops · dose 3"],
    ["penta3", "Five-in-one (pentavalent) · dose 3"],
    ["rvv3", "Rotavirus · dose 3"],
    ["fipv2", "Polio injection (fIPV) · dose 2"],
    ["pcv2", "Pneumococcal (PCV) · dose 2"],
  ]),
  ...group("9–12 months", [
    ["mr1", "Measles & rubella · dose 1"],
    ["pcvb", "Pneumococcal (PCV) · booster"],
    ["fipv3", "Polio injection (fIPV) · dose 3"],
  ]),
  ...group(
    "9–12 months",
    [["je1", "Japanese encephalitis · dose 1"]],
    "Only in relevant endemic districts; confirm locally.",
  ),
  ...group("16–24 months", [
    ["mr2", "Measles & rubella · dose 2"],
    ["dptb1", "Diphtheria, whooping cough & tetanus · booster 1"],
    ["opvb", "Polio drops · booster"],
  ]),
  ...group(
    "16–24 months",
    [["je2", "Japanese encephalitis · dose 2"]],
    "Only in relevant endemic districts; confirm locally.",
  ),
  ...group("5–6 years", [
    ["dptb2", "Diphtheria, whooping cough & tetanus · booster 2"],
  ]),
  ...group("10 years", [["td10", "Tetanus & diphtheria (Td) · age 10"]]),
  ...group(
    "14 years · eligible girls",
    [["hpv14", "HPV · discuss eligibility"]],
    "India introduced a programme for 14-year-old girls in 2026. Confirm eligibility and the recommended schedule with your clinician. Kahiye does not infer eligibility.",
  ),
  ...group("16 years", [["td16", "Tetanus & diphtheria (Td) · age 16"]]),
];
