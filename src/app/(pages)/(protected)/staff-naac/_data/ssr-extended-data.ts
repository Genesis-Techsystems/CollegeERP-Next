/** Angular staff-naac Extended Profile snapshot values (assessmentonline HEI scrape). */

export type YearValue = { year: string; value: string };

export type DocRow = {
  description: string;
  templateLabel?: string;
  templateHref?: string;
  fileName?: string;
};

export type MetricBlock = {
  id: string;
  title: string;
  years: YearValue[];
  documents: DocRow[];
};

export type ExtendedSection = {
  number: string;
  title: string;
  metrics: MetricBlock[];
};

const FIVE_YEARS: YearValue[] = [
  { year: "2021-22", value: "554" },
  { year: "2020-21", value: "405" },
  { year: "2019-20", value: "250" },
  { year: "2018-19", value: "241" },
  { year: "2017-18", value: "171" },
];

export const EXTENDED_PROFILE_SECTIONS: ExtendedSection[] = [
  {
    number: "1",
    title: "Students",
    metrics: [
      {
        id: "1.1",
        title: "Number of students year wise during the last five years",
        years: FIVE_YEARS,
        documents: [
          {
            description: "Upload Supporting Document",
            fileName: "1.1_E_L.pdf",
          },
          {
            description: "Institutional data in prescribed format",
            templateLabel: "Data Template",
            templateHref:
              "https://assessmentonline.naac.gov.in/public/index.php/hei/generate_excel/extended",
            fileName: "1.1_E_L.xlsx",
          },
        ],
      },
    ],
  },
  {
    number: "2",
    title: "Teachers",
    metrics: [
      {
        id: "2.1",
        title: "Number of full time teachers year wise during the last five years",
        years: [
          { year: "2021-22", value: "32" },
          { year: "2020-21", value: "28" },
          { year: "2019-20", value: "24" },
          { year: "2018-19", value: "22" },
          { year: "2017-18", value: "18" },
        ],
        documents: [
          {
            description: "Upload Supporting Document",
            fileName: "2.1_E_L.pdf",
          },
          {
            description: "Institutional data in prescribed format",
            templateLabel: "Data Template",
            fileName: "2.1_E_L.xlsx",
          },
        ],
      },
    ],
  },
  {
    number: "3",
    title: "Institution",
    metrics: [
      {
        id: "3.1",
        title: "Expenditure excluding salary component year wise during the last five years (INR in Lakhs)",
        years: [
          { year: "2021-22", value: "52.92" },
          { year: "2020-21", value: "34.38" },
          { year: "2019-20", value: "28.10" },
          { year: "2018-19", value: "25.40" },
          { year: "2017-18", value: "21.15" },
        ],
        documents: [
          {
            description: "Upload Supporting Document",
            fileName: "3.1_E_L.pdf",
          },
          {
            description: "Institutional data in prescribed format",
            templateLabel: "Data Template",
            fileName: "3.1_E_L.xlsx",
          },
        ],
      },
    ],
  },
];

export const QIF_CRITERIA = [
  { id: "1", title: "Curricular Aspects" },
  { id: "2", title: "Teaching-learning and Evaluation" },
  { id: "3", title: "Research, Innovations and Extension" },
  { id: "4", title: "Infrastructure and Learning Resources" },
  { id: "5", title: "Student Support and Progression" },
  { id: "6", title: "Governance, Leadership and Management" },
  { id: "7", title: "Institutional Values and Best Practices" },
] as const;
