/** Hardcoded HEI snapshot from Angular `ssr-profile` / `ssr-profile-page` (Latur College). */

export const SSR_COLLEGE_ADDRESS = {
  Name: "LATUR COLLEGE OF PHARMACY HASEGAON",
  Address: "Gurunathappa Bavage Knowledge City, Hasegaon, Tq. Ausa Dist. Latur",
  City: "Latur",
  Pin: "413520",
  State: "Maharashtra",
  Website: "www.lcophasegaon.org.in",
};

/** Screenshot / staff-naac scraped contacts (not the buggy naac-assessment Contacts array). */
export const SSR_CONTACTS = [
  {
    Designation: "Principal",
    Name: "Dr. Lonikar Nitin Balasaheb",
    TelephonewithSTDCode: "02382-350100",
    Mobile: "9421368612",
    Fax: "02382-350102",
    Email: "laturcollegeofpharmacyhasegaon@gmail.com",
  },
  {
    Designation: "IQAC / CIQA coordinator",
    Name: "Dr. Shyamlila Bhimashankar Bavage",
    TelephonewithSTDCode: "02382-350101",
    Mobile: "9422472939",
    Fax: "02382-350102",
    Email: "shyamlilabavage@gmail.com",
  },
];

export const SSR_LOCATION = [
  {
    CampusType: "Main campus",
    Address:
      "Gurunathappa Bavage Knowledge City, Hasegaon, Tq. Ausa Dist. Latur",
    Location: "",
    CampusAreainAcres: "",
    BuiltupAreainsqmts: "",
  },
];

export const SSR_ESTABLISHMENT = {
  date: "01/01/2015",
  yearsCompleted: "",
  universityState: "Maharashtra",
  universityName: "Swami Ramanand Teerth Marathwada University",
};

/** Angular `ssr-profile` "Status of the Institution" / "Type of Institution" editable form fields. */
export type SsrInstitutionStatusForm = {
  institutionStatus: string;
  byGender: string;
  byShiftRegular: boolean;
  byShiftDay: boolean;
  byShiftEvening: boolean;
  minorityInstitution: "no" | "yes";
  minorityReligious: string;
  minorityLinguistic: string;
  minorityOther: string;
  cpeRecognized: string;
  recognizedByAgency: "no" | "yes";
  agencyName: string;
  agencyRecognitionDate: string;
  autonomyConferment: "no" | "yes";
  autonomousApplied: string;
};

export const SSR_INSTITUTION_STATUS_DEFAULTS: SsrInstitutionStatusForm = {
  institutionStatus: "Private Self Financing",
  byGender: "0",
  byShiftRegular: false,
  byShiftDay: false,
  byShiftEvening: false,
  minorityInstitution: "no",
  minorityReligious: "",
  minorityLinguistic: "",
  minorityOther: "",
  cpeRecognized: "No",
  recognizedByAgency: "no",
  agencyName: "",
  agencyRecognitionDate: "",
  autonomyConferment: "no",
  autonomousApplied: "",
};

/** Angular `ssr-profile` "Location and Area of the Campus" editable row. */
export type SsrLocationForm = {
  locationType: string;
  campusAreaAcres: string;
  builtUpAreaSqMts: string;
};

export const SSR_LOCATION_FORM_DEFAULTS: SsrLocationForm = {
  locationType: "",
  campusAreaAcres: "",
  builtUpAreaSqMts: "",
};

/** Angular `ssr-profile` "University to which affiliated" + UGC recognition rows. */
export const SSR_UGC_RECOGNITION = [
  { section: "2f of UGC", date: "", document: "" },
  { section: "12B of UGC", date: "", document: "" },
];

/** Angular statutory approval row — PCI with editable date / validity / remarks. */
export type StatutoryApprovalRow = {
  authority: string;
  documentUrl: string;
  date: string;
  validityMonths: string;
  remarks: string;
};

export const SSR_STATUTORY_APPROVAL_DEFAULTS: StatutoryApprovalRow[] = [
  {
    authority: "PCI",
    documentUrl:
      "https://assessmentonline.naac.gov.in/storage/app/hei/iiqa/sradocuments/114626_11926_6_1686115615.pdf",
    date: "",
    validityMonths: "",
    remarks: "",
  },
];

/** Kept for display-only consumers. Prefer {@link SSR_STATUTORY_APPROVAL_DEFAULTS}. */
export const SSR_STATUTORY_APPROVAL = SSR_STATUTORY_APPROVAL_DEFAULTS.map(
  ({ authority, date, validityMonths, remarks }) => ({
    authority,
    program: "",
    date,
    validityMonths,
    remarks,
  }),
);

/** Medium of Instruction options — Angular `prgmmed_sel_*` selectpicker list. */
export const SSR_MEDIUM_OF_INSTRUCTION = [
  "English",
  "Hindi",
  "Bengali",
  "Telugu",
  "Marathi",
  "Tamil",
  "Urdu",
  "Gujarati",
  "Kannada",
  "Malayalam",
  "Oriya",
  "Punjabi",
  "Assamese",
  "Sanskrit",
  "French",
  "English + Hindi",
  "English + Bengali",
  "English + Telugu",
  "English + Marathi",
  "English + Tamil",
] as const;

/** Angular programs offered rows (`prgm_1` / `prgmnm_1` / editable fields). */
export type ProgramOfferedRow = {
  level: string;
  name: string;
  durationMonths: string;
  entryQualification: string;
  mediumOfInstruction: string[];
  sanctionedStrength: string;
  studentsAdmitted: string;
};

export const SSR_PROGRAMS_OFFERED_DEFAULT: ProgramOfferedRow[] = [
  {
    level: "UG",
    name: "BPharm,Pharmacy,",
    durationMonths: "",
    entryQualification: "",
    mediumOfInstruction: [],
    sanctionedStrength: "",
    studentsAdmitted: "",
  },
  {
    level: "PG",
    name: "MPharm,Pharmacy,",
    durationMonths: "",
    entryQualification: "",
    mediumOfInstruction: [],
    sanctionedStrength: "",
    studentsAdmitted: "",
  },
];

/** @deprecated Use {@link SSR_PROGRAMS_OFFERED_DEFAULT}. */
export const SSR_PROGRAMS = SSR_PROGRAMS_OFFERED_DEFAULT.map((p) => ({
  LevelofProgram: p.level,
  NameofProgramCourse: p.name,
  DurationinMonths: p.durationMonths,
  EntryQualification: p.entryQualification,
  MediumofInstruction: p.mediumOfInstruction.join(", "),
  NoofStudentsAdmitted: p.studentsAdmitted,
  SanctionedStrength: p.sanctionedStrength,
}));

/** Angular `ssr-profile` Academic Information — self-financed summary table. */
export type AcademicProgramRow = {
  program: string;
  selfFinanced: string;
  newProgramsLastFiveYears: string;
};

export const SSR_ACADEMIC_PROGRAMS_DEFAULT: AcademicProgramRow = {
  program: "",
  selfFinanced: "",
  newProgramsLastFiveYears: "",
};

export type FacultyPositionRow = {
  designation: string;
  sanctioned: string;
  filled: string;
};

export const SSR_FACULTY_POSITIONS: FacultyPositionRow[] = [
  { designation: "Professor", sanctioned: "", filled: "" },
  { designation: "Associate Professor", sanctioned: "", filled: "" },
  { designation: "Assistant Professor", sanctioned: "", filled: "" },
];

export type QualificationRow = {
  qualification: string;
  count: string;
};

export const SSR_TEACHING_QUALIFICATIONS: QualificationRow[] = [
  { qualification: "Ph.D", count: "" },
  { qualification: "M.Phil", count: "" },
  { qualification: "PG", count: "" },
];

export type StudentEnrollmentRow = {
  category: string;
  ug: string;
  pg: string;
};

export const SSR_STUDENT_ENROLLMENT: StudentEnrollmentRow[] = [
  { category: "From the state where college is located", ug: "", pg: "" },
  { category: "From other states of India", ug: "", pg: "" },
  { category: "NRI students", ug: "", pg: "" },
  { category: "Foreign students", ug: "", pg: "" },
];

export type AdmittedYearRow = {
  year: string;
  ug: string;
  pg: string;
};

export const SSR_STUDENTS_ADMITTED_LAST_FOUR_YEARS: AdmittedYearRow[] = [
  { year: "2021-22", ug: "", pg: "" },
  { year: "2020-21", ug: "", pg: "" },
  { year: "2019-20", ug: "", pg: "" },
  { year: "2018-19", ug: "", pg: "" },
];

export type UnitCostForm = {
  unitCost: string;
  includingSalary: string;
  excludingSalary: string;
};

export const SSR_UNIT_COST_DEFAULTS: UnitCostForm = {
  unitCost: "",
  includingSalary: "",
  excludingSalary: "",
};

/**
 * Angular `ssr-profile` "Institutional preparedness for NEP" tab — real scraped
 * CKEditor textarea content (`nep_multi`, `nep_abc`, `nep_skill`, `nep_iks`,
 * `nep_obe`, `nep_distant`). Rendered as editable textareas (no persist backend).
 */
export type NepItem = { id: string; label: string; defaultText: string };

export const SSR_NEP_ITEMS: NepItem[] = [
  {
    id: "nep_multi",
    label: "1. Multidisciplinary/interdisciplinary:",
    defaultText:
      "Multidisciplinary research is defined as research conducted when specialists from multiple professions collaborate on a common topic within the boundaries of their respective disciplines. However, if they limit their efforts to these parameters, they may not achieve the intended results. It is necessary for them to look outside of their respective fields in order to generate new ideas and construct a multidisciplinary proposal. In order to transcend academic boundaries and adopt a more holistic approach, an interdisciplinary research team must develop sufficient mutual trust and certainty. Frequently, information is transmitted through mutual interaction. Unquestionably, the findings of all specialized research are utilized for the benefit of humanity.\n\nCommunication in all scientific fields that seek to benefit humanity requires precision. To obtain a better comprehension among members of an interdisciplinary team with differing perspectives, it is necessary to narrow the gap and improve mutual communication. Languages, mathematical appliances, and other tools will unquestionably help team members from diverse origins work on the same platform. For instance, research in biomedical engineering incorporates non-engineering domains such as biology, medicine, and pharmacology; therefore, communication between team members is essential for attaining successful research outcomes.",
  },
  {
    id: "nep_abc",
    label: "2. Academic bank of credits (ABC):",
    defaultText:
      "Academic Bank of Credits was established in the same manner as the National Academic Depository (NAD), which functions as the backbone of ABC by storing academic data and academic awards (i.e. a repository of academic awards). Academic institutions administer the final results of credit redemption and certificate issuing, as well as the compilation of award records, through the NAD Platform. Academic Institutions, as the owners of academic prizes, must register with ABC through NAD.",
  },
  {
    id: "nep_skill",
    label: "3. Skill development:",
    defaultText:
      "Education is the foundation of human resource development and the engine of a nation's economic growth. However, the value of education cannot be realized without a supplementary skill for employment or vocation. Due to curriculum and time constraints, the Institute offers a variety of skill development courses for the overall development of students into competent pharmacists and pharmacy professionals. These activities help students enhance their abilities so that they can maximize their educational experience. Building capacity is a methodical approach to enhancing knowledge and skills. It ensures that an organization has the necessary internal skills to implement change and boost performance.",
  },
  {
    id: "nep_iks",
    label:
      "4. Appropriate integration of Indian Knowledge system (teaching in Indian Language, culture, using online course):",
    defaultText:
      "The Indian Education System requires a complete makeover. It recognizes that India's unique position on the international stage is the result of its cultural advancements, civilisational ideals, and wealth of literature in all fields. Therefore, beginning with the foundational stage, all curriculum and pedagogy must be redesigned so that they are deeply rooted in the Indian and local context and ethos in terms of culture, traditions, heritage, customs, language, philosophy, geography, ancient and contemporary knowledge, societal and scientific needs, and indigenous and traditional ways of learning. This type of curriculum would ensure that our students receive an education that is relevant, current, engaging, and efficient. It would also result in the formation of a strong identity, as the new generation would be well-versed in India's diverse culture and traditions and be able to appreciate them.",
  },
  {
    id: "nep_obe",
    label: "5. Focus on Outcome based education (OBE):",
    defaultText:
      "Therefore, beginning with the foundational stage, all curriculum and pedagogy must be redesigned so that they are deeply rooted in the Indian and local context and ethos in terms of culture, traditions, heritage, customs, language, philosophy, geography, ancient and contemporary knowledge, societal and scientific needs, and indigenous and traditional ways of learning. This type of curriculum would ensure that our students receive an education that is relevant, current, engaging, and efficient. It would also result in the formation of a strong identity, as the new generation would be well-versed in India's diverse culture and traditions and be able to appreciate them.",
  },
  {
    id: "nep_distant",
    label: "6. Distance education/online education:",
    defaultText:
      "Since the last two decades, e-learning has emerged as a novel pedagogy in pharmacy education. As more students and instructors seek out e-learning options for a variety of educational and personal reasons, it is crucial to evaluate the effectiveness of these programs. This literature review analyzes the quality of pharmacy e-learning effectiveness studies, outlines efficacy measures, and synthesizes the evidence for each measure. E-learning is a well-liked instructional method among pharmacists and pharmacy students because it enhances knowledge in pharmacy education. However, there is scant evidence that e-learning enhances skills or professional practice. In addition, there is little evidence that e-learning enhances knowledge over time; therefore, long-term follow-up research is required. In order to assess the value of e-learning at the patient and organizational levels, translational research is also required.",
  },
];

/** Angular `ssr-profile` "Institutional Initiatives for Electoral Literacy" tab (blank scraped textareas). */
export type LiteracyItem = { id: string; label: string };

export const SSR_LITERACY_ITEMS: LiteracyItem[] = [
  {
    id: "literacy1",
    label:
      "1. Whether Electoral Literacy Club (ELC) has been set up in the College?",
  },
  {
    id: "literacy2",
    label:
      "2. Whether students' co-ordinator and co-ordinating faculty members are appointed by the College and whether the ELCs are functional? Whether the ELCs are representative in character?",
  },
  {
    id: "literacy3",
    label:
      "3. What innovative programmes and initiatives undertaken by the ELCs? These may include voluntary contribution by the students in electoral processes — participation in voter registration of students and communities where they come from, assisting district election administration in conduct of poll, voter awareness campaigns, promotion of ethical voting, enhancing participation of the under privileged sections of society especially transgender, commercial sex workers, disabled persons, senior citizens, etc.",
  },
  {
    id: "literacy4",
    label:
      "4. Any socially relevant projects/initiatives taken by College in electoral related issues especially research projects, surveys, awareness drives, creating content, publications highlighting their contribution to advancing democratic values and participation in electoral processes, etc.",
  },
  {
    id: "literacy5",
    label:
      "5. Extent of students above 18 years who are yet to be enrolled as voters in the electoral roll and efforts by ELCs as well as efforts by the College to institutionalize mechanisms to register eligible students as voters.",
  },
];
