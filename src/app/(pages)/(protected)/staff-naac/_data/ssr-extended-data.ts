/** Angular staff-naac Extended Profile + QIF snapshot (assessmentonline HEI scrape). */

export type YearValue = { year: string; value: string };

export type DocRow = {
  description: string;
  required?: boolean;
  templateLabel?: string;
  templateHref?: string;
  fileName?: string;
  fileHref?: string;
  /** Link input row (Angular `input_url_*`) instead of file upload. */
  linkInput?: boolean;
  linkValue?: string;
  otherFilesHeader?: boolean;
  otherFile?: boolean;
  questionnaireId?: string | number;
  fileformatId?: string | number;
  seq?: string | number;
};

export type MetricKind = "years" | "single";

export type MetricBlock = {
  id: string;
  title: string;
  kind: MetricKind;
  /** Used when `kind === "single"` (Angular Teachers 2.1). */
  singleValue?: string;
  years?: YearValue[];
  documents: DocRow[];
};

export type ExtendedSection = {
  number: string;
  title: string;
  metrics: MetricBlock[];
};

const FIVE_YEARS_LABELS = [
  "2021-22",
  "2020-21",
  "2019-20",
  "2018-19",
  "2017-18",
] as const;

function yearsOf(...values: string[]): YearValue[] {
  return FIVE_YEARS_LABELS.map((year, i) => ({
    year,
    value: values[i] ?? "",
  }));
}

const DATA_TEMPLATE_BASE =
  "https://assessmentonline.naac.gov.in/storage/app/admin/dynamicfiles";

export const EXTENDED_PROFILE_SECTIONS: ExtendedSection[] = [
  {
    number: "1",
    title: "Students",
    metrics: [
      {
        id: "1.1",
        title: "Number of students year wise during the last five years",
        kind: "years",
        years: yearsOf("554", "405", "250", "241", "171"),
        documents: [
          {
            description: "Upload Supporting Document",
            fileName: "1.1_E_L.pdf",
            fileHref:
              "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/dynamic_1689399377_11926.pdf",
          },
          {
            description: "Institutional data in prescribed format",
            required: true,
            templateLabel: "Data Template",
            templateHref: `${DATA_TEMPLATE_BASE}/1.1_179.xlsx`,
            fileName: "1.1_E_L.xlsx",
            fileHref:
              "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/dynamic_1688460997_11926.xlsx",
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
        title:
          "Number of teaching staff / full time teachers during the last five years (Without repeat count):",
        kind: "single",
        singleValue: "139",
        documents: [
          {
            description: "Upload Supporting Document",
          },
          {
            description: "Institutional data in prescribed format",
            required: true,
            templateLabel: "Data Template",
            templateHref: `${DATA_TEMPLATE_BASE}/2.1_179.xlsx`,
            fileName: "2.1_E_L.xlsx",
            fileHref:
              "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/dynamic_1688979181_11926.xlsx",
          },
        ],
      },
      {
        id: "2.2",
        title:
          "Number of teaching staff / full time teachers year wise during the last five years",
        kind: "years",
        years: yearsOf("43", "35", "20", "24", "17"),
        documents: [],
      },
    ],
  },
  {
    number: "3",
    title: "Institution",
    metrics: [
      {
        id: "3.1",
        title:
          "Expenditure excluding salary component year wise during the last five years (INR in lakhs)",
        kind: "years",
        years: yearsOf("52.92", "48.66", "34.38", "00", "50.04"),
        documents: [
          {
            description: "Upload Supporting Document",
          },
        ],
      },
    ],
  },
];
