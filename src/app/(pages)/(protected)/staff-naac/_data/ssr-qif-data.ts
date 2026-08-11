/** Auto-generated from Angular ssr-extended-profile QIF tab.
 * Regenerate:
 *   node scripts/parse-qif-html.mjs <angular-html>
 *   node scripts/build-qif-data.mjs
 */
import type { YearValue } from "./ssr-extended-data";

export type QifDocRow = {
  description: string;
  required?: boolean;
  templateLabel?: string;
  templateHref?: string;
  fileName?: string;
  fileHref?: string;
  linkInput?: boolean;
  linkValue?: string;
  otherFilesHeader?: boolean;
  otherFile?: boolean;
  questionnaireId?: string | number;
  fileformatId?: string | number;
  seq?: string | number;
};

export type QifFieldKind =
  | "richtext"
  | "numeric"
  | "years"
  | "textarea"
  | "radio";

export type QifMetric = {
  id: string;
  title: string;
  kind: QifFieldKind;
  defaultValue?: string;
  disabled?: boolean;
  suffix?: string;
  hint?: string;
  years?: YearValue[];
  options?: { value: string; label: string; checked?: boolean }[];
  relatedInput?: { label: string; years: YearValue[] };
  documents?: QifDocRow[];
  nestedPanel?: boolean;
};

export type QifSubMetric = {
  id: string;
  title: string;
  metrics: QifMetric[];
};

export type QifCriterion = {
  id: string;
  title: string;
  answeredLabel: string;
  subMetrics: QifSubMetric[];
};

export const QIF_CRITERIA: QifCriterion[] = [
  {
    "id": "1",
    "title": "Curricular Aspects",
    "answeredLabel": "answered: 6/6",
    "subMetrics": [
      {
        "id": "1.1",
        "title": "Curricular Planning and Implementation",
        "metrics": [
          {
            "id": "1.1.1",
            "title": "The Institution ensures effective curriculum planning and delivery through a well-planned and documented process including Academic calendar and conduct of continuous internal Assessment",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false,
                "fileName": "1.1.1.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/1.1.1_1689398502_11926.pdf"
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false,
            "defaultValue": "<p>Being affiliated with Swami Ramanand Teerth Marathwada University (SRTMU, Nanded, Maharashtra), the institute follows the curriculum, program structure and academic regulations prescribed by the university. The university reviews and restructures the syllabus and curriculum at regular intervals where the minimum requirements, standards and quality of education are maintained as per the regulatory requirements of PCI . The programs offered by the institution are B. Pharm, Pharm D and M. Pharm. For the effective implementation, the following steps are adopted by the institution:  A. Pre-Planning:1. How? By making sure the required number of classes are scheduled according to the Institute's curriculum.2. By modeling our semester/annual schedule after that of SRTM University Nanded, we were able to create a comprehensive academic calendar for the entire Institute.3. Create a course file at the beginning of each semester that includes the course calendar, syllabus, question bank, assignment bank, and required readings.  4. By establishing separate staff committees for each initiative.  B. Program-specific academic calendars, time tables, and test schedules are prepared in advance and posted in visible locations across the college. Teaching notes and attendance registers, both of which are approved by the HOD before being submitted to the IQAC Coordinator, serve as documentation of the curriculum's implementation in accordance with the academic calendar. The college places an emphasis on student-centric learning methods such as experiential learning through teaching, seminars, posters, group projects, and group discussions, and the faculty members are encouraged to use ICT tools like projectors to deliver the content. Emphasis on getting actual work done. We have a framed list of mentors and mentees. The Institute also offers Certificate and Extension Programs to bridge the gap between the business world and the classroom. Experts in the field and the academy team up to host seminars, workshops, and conferences including guest speakers. Students are encouraged to participate in NSS activities and are supported by the institute's research and development department.C. The Principal will have faculty meetings to discuss the results, attendance, and other aspects of the teaching and action plans of each instructor. If there is a departure from the original plan, corrective measures are taken and plans are developed to fill the voids. When students request them, we schedule extra lessons. Student comments are collected to gauge how well the curriculum is being delivered. The obtained data is then examined to see where the curriculum delivery might be strengthened. The college follows the schedule established by its parent institution, SRTMU Nanded. Exam, Co-Curricular, and Extra-Curricular events are scheduled according to the University's academic calendar and at the institution level to promote students' holistic growth. Exams and grading are administered and overseen in accordance with the University's academic calendar; if any discrepancies are found, the Principal will notify faculty and students by circular. Textbooks and supplementary materials for both theoretical and applied courses, as well as semester schedules, are made available to students.</p>"
          }
        ]
      },
      {
        "id": "1.2",
        "title": "Academic Flexibility",
        "metrics": [
          {
            "id": "1.2.1",
            "title": "Number of Certificate/Value added courses offered and online courses of MOOCs, SWAYAM, NPTEL etc. (where the students of the institution have enrolled and successfully completed during the last five years)",
            "kind": "numeric",
            "defaultValue": "26",
            "disabled": false,
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "List of students and the attendance sheet for the above mentioned programs",
                "required": false
              },
              {
                "description": "Institutional programme brochure/notice for Certificate/Value added programs with course modules and outcomes",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/1.2.1.xlsx",
                "fileName": "ADD ON 1.2.1.xlsx",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/1.2.1_1688359597_11926.xlsx"
              },
              {
                "description": "Evidence of course completion, like course completion certificate etc. Apart from the above:",
                "required": false
              },
              {
                "description": "Upload Other Files:",
                "otherFilesHeader": true
              },
              {
                "description": "1",
                "otherFile": true
              }
            ],
            "nestedPanel": false
          },
          {
            "id": "1.2.2",
            "title": "Percentage of students enrolled in Certificate/ Value added courses and also completed online courses of MOOCs, SWAYAM, NPTEL etc. as against the total number of students during the last five years",
            "kind": "numeric",
            "defaultValue": "80.51",
            "disabled": true,
            "suffix": "%",
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "1.2.2.1",
            "title": "Number of students enrolled in Certificate/ Value added courses and also completed online courses of MOOCs, SWAYAM, NPTEL etc. as against the total number of students during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": "353"
              },
              {
                "year": "2020-21",
                "value": "312"
              },
              {
                "year": "2019-20",
                "value": "245"
              },
              {
                "year": "2018-19",
                "value": "231"
              },
              {
                "year": "2017-18",
                "value": "164"
              }
            ],
            "relatedInput": {
              "label": "Number of students year wise during the last five years",
              "years": [
                {
                  "year": "Year 1",
                  "value": "554"
                },
                {
                  "year": "Year 2",
                  "value": "405"
                },
                {
                  "year": "Year 3",
                  "value": "250"
                },
                {
                  "year": "Year 4",
                  "value": "241"
                },
                {
                  "year": "Year 5",
                  "value": "171"
                }
              ]
            },
            "documents": [
              {
                "description": "Upload supporting document",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/1.2.1 & 1.2.2.xlsx",
                "fileName": "1.2.1 & 1.2.2.xlsx",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/1.2.2_1688364131_11926.xlsx"
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "1.3",
        "title": "Curriculum Enrichment",
        "metrics": [
          {
            "id": "1.3.1",
            "title": "Institution integrates crosscutting issues relevant to Professional Ethics, Gender, Human Values, Environment and Sustainability in transacting the Curriculum",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false,
                "fileName": "1.3.1.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/1.3.1_1689398523_11926.pdf"
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false,
            "defaultValue": "<p>Our college's academic and extracurricular programs aim to provide a well-rounded education by fostering in students a respect for themselves and others, an appreciation for the natural world, a commitment to social justice, and a sense of environmental stewardship. Human Values and Professional Ethics: The \"Human Values and Professional Ethics\" course, offered in the third year of B.Pharmacy at SRTMU,  helps students internalize and apply core ethical principles in their own lives and careers. Our college students organize and attend health camps to benefit their communities outside of the classroom. Students also get the opportunity to show off their knowledge to the public through health awareness programmes. College organizes numerous community service programs, such as health camps, health rallies, and blood donation camps, to raise health awareness among the rural people and foster social responsibility among the students. Engaging with the community in this way will unquestionably instill students with ethical and human values, allowing them to become not only competent professionals, but also conscientious members of society. The College organizes special lectures in the institution to inculcate professional ethics in their day to-day life.   Gender Issues:There is a Gender Sensitization Cell that aims to educate and empower students on gender issues. Our college's professors regularly hold discussions on topics such as gender biology, gender and labor, violence against women, and gender equality. The internal complaint committee for sexual harassment ensures the confidentiality of all matters pertaining to gender. Seminars, NSS rallies, and professional programs hosted by a wide range of organizations all feature critical discourse on gender, human rights, and related topics. The College sponsors Women's Day events and Women Empowerment Programs to help its female students develop their full potential. In accordance with established protocol, a special group dedicated to addressing women's concerns has been established: the Gender Sensitization Cell (Women Grievances). Sustainability in the Environment: To highlight the importance of environmental education, natural resource, and their conservation, the SRTMU, Nanded, Maharashtra has integrated a course named environmental sciences within the B.Pharmacy curriculum and faculty of our college. The college hosts seminars, guest lectures, workshops, and other events in the name of hazards of plastic usage, Swach Bharat, and Swachta Oath to educate and sensitize the students about environmental and sustainability issues, the importance of cleanliness, and individual responsibilities regarding the same. Besides required coursework, our college offers a number of environmental and sustainability-related extracurricular activities, such as an industry visit for senior students to show them how the business handles issues like air and water pollution, hazardous waste disposal, and solid waste management.</p>"
          },
          {
            "id": "1.3.2",
            "title": "Percentage of students undertaking project work/field work/ internships (Data for the latest completed academic year)",
            "kind": "numeric",
            "defaultValue": "35.2",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "1.3.2.1",
            "title": "Number of students undertaking project work/field work / internships",
            "kind": "numeric",
            "defaultValue": "195",
            "disabled": false,
            "relatedInput": {
              "label": "Number of students year wise during the last five years",
              "years": [
                {
                  "year": "Year 1",
                  "value": "554"
                },
                {
                  "year": "Year 2",
                  "value": "405"
                },
                {
                  "year": "Year 3",
                  "value": "250"
                },
                {
                  "year": "Year 4",
                  "value": "241"
                },
                {
                  "year": "Year 5",
                  "value": "171"
                }
              ]
            },
            "documents": [
              {
                "description": "Upload supporting document",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/1.3.2.xlsx"
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "1.4",
        "title": "Feedback System",
        "metrics": [
          {
            "id": "1.4.1",
            "title": "Institution obtains feedback on the academic performance and ambience of the institution from various stakeholders, such as Students, Teachers, Employers, Alumni etc. and action taken report on the feedback is made available on institutional website",
            "kind": "radio",
            "defaultValue": "5086",
            "options": [
              {
                "value": "5086",
                "label": "A. Feedback collected, analysed, action taken& communicated to the relevant bodies and feedback hosted on the institutional website",
                "checked": true
              },
              {
                "value": "5087",
                "label": "B. Feedback collected, analysed and action has been taken and communicated to the relevant bodies",
                "checked": false
              },
              {
                "value": "5088",
                "label": "C. Feedback collected and analysed",
                "checked": false
              },
              {
                "value": "5089",
                "label": "D. Feedback collected",
                "checked": false
              },
              {
                "value": "5090",
                "label": "E. Feedback not collected",
                "checked": false
              }
            ],
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Link of institution’s website where comprehensive feedback, its analytics and action taken report are hosted",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Feedback analysis report submitted to appropriate bodies",
                "required": false,
                "fileName": "FEEDBACK ANALYSIS AND ACTION TAKEN REPORT_compressed.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/1.4.1_1687774105_11926.pdf"
              },
              {
                "description": "At least 4 filled-in feedback form from different stake holders like Students, Teachers, Employers, Alumni etc.",
                "required": false,
                "fileName": "SAMPLE FILLED FEEDBACK.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/1.4.1_1687770438_11926.pdf"
              },
              {
                "description": "Action taken report on the feedback analysis",
                "required": false,
                "fileName": "ACTION TAKEN REPORTS B&W Attested_compressed.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/1.4.1_1688358920_11926.pdf"
              }
            ],
            "nestedPanel": false
          }
        ]
      }
    ]
  },
  {
    "id": "2",
    "title": "Teaching-learning and Evaluation",
    "answeredLabel": "answered: 7/11",
    "subMetrics": [
      {
        "id": "2.1",
        "title": "Student Enrollment and Profile",
        "metrics": [
          {
            "id": "2.1.1",
            "title": "Enrolment percentage",
            "kind": "numeric",
            "defaultValue": "96.51",
            "disabled": true,
            "suffix": "%",
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "2.1.1.1",
            "title": "Number of seats filled year wise during last five years (Only first year admissions to be considered)",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": "190"
              },
              {
                "year": "2020-21",
                "value": "175"
              },
              {
                "year": "2019-20",
                "value": "49"
              },
              {
                "year": "2018-19",
                "value": "60"
              },
              {
                "year": "2017-18",
                "value": "52"
              }
            ],
            "documents": [],
            "nestedPanel": true
          },
          {
            "id": "2.1.1.2",
            "title": "Number of sanctioned seats year wise during last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": "190"
              },
              {
                "year": "2020-21",
                "value": "175"
              },
              {
                "year": "2019-20",
                "value": "60"
              },
              {
                "year": "2018-19",
                "value": "60"
              },
              {
                "year": "2017-18",
                "value": "60"
              }
            ],
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/2.1.1&2.1.2.xlsx"
              },
              {
                "description": "Final admission list as published by the HEI and endorsed by the competent authority",
                "required": false
              },
              {
                "description": "Document related to sanction of intake from affiliating University/ Government/statutory body for first year’s students only.",
                "required": false
              }
            ],
            "nestedPanel": true
          },
          {
            "id": "2.1.2",
            "title": "Percentage of seats filled against reserved categories (SC, ST, OBC etc.) as per applicable reservation policy for the first year admission during the last five years",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "2.1.2.1",
            "title": "Number of actual students admitted from the reserved categories year wise during last five years (Exclusive of supernumerary seats)",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [],
            "nestedPanel": true
          },
          {
            "id": "2.1.2.2",
            "title": "Number of seats earmarked for reserved category as per GOI/ State Govt rule year wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/2.1.1&2.1.2.xlsx"
              },
              {
                "description": "Final admission list indicating the category as published by the HEI and endorsed by the competent authority.",
                "required": false
              },
              {
                "description": "Copy of communication issued by state govt. or Central Government indicating the reserved categories(SC,ST,OBC,Divyangjan,etc.) to be considered as per the state rule ( Translated copy in English to be provided as applicable)",
                "required": false
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "2.2",
        "title": "Student Teacher Ratio",
        "metrics": [
          {
            "id": "2.2.1",
            "title": "Student – Full time Teacher Ratio (Data for the latest completed academic year)",
            "kind": "numeric",
            "defaultValue": "12.88",
            "disabled": true,
            "relatedInput": {
              "label": "Number of students year wise during the last five years",
              "years": [
                {
                  "year": "Year 1",
                  "value": "554"
                },
                {
                  "year": "Year 2",
                  "value": "405"
                },
                {
                  "year": "Year 3",
                  "value": "250"
                },
                {
                  "year": "Year 4",
                  "value": "241"
                },
                {
                  "year": "Year 5",
                  "value": "171"
                }
              ]
            },
            "documents": [],
            "nestedPanel": false
          }
        ]
      },
      {
        "id": "2.3",
        "title": "Teaching- Learning Process",
        "metrics": [
          {
            "id": "2.3.1",
            "title": "Student centric methods, such as experiential learning, participative learning and problem solving methodologies are used for enhancing learning experiences and teachers use ICT- enabled tools including online resources for effective teaching and learning process",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false,
                "fileName": "2.3.1_L.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/2.3.1_1689066614_11926.pdf"
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false
          }
        ]
      },
      {
        "id": "2.4",
        "title": "Teacher Profile and Quality",
        "metrics": [
          {
            "id": "2.4.1",
            "title": "Percentage of full-time teachers against sanctioned posts during the last five years",
            "kind": "numeric",
            "defaultValue": "100",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "2.4.1.1",
            "title": "Number of sanctioned posts year wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": "43"
              },
              {
                "year": "2020-21",
                "value": "35"
              },
              {
                "year": "2019-20",
                "value": "20"
              },
              {
                "year": "2018-19",
                "value": "24"
              },
              {
                "year": "2017-18",
                "value": "17"
              }
            ],
            "relatedInput": {
              "label": "Number of teaching staff / full time teachers year wise during the last five years",
              "years": [
                {
                  "year": "Year 1",
                  "value": "43"
                },
                {
                  "year": "Year 2",
                  "value": "35"
                },
                {
                  "year": "Year 3",
                  "value": "20"
                },
                {
                  "year": "Year 4",
                  "value": "24"
                },
                {
                  "year": "Year 5",
                  "value": "17"
                }
              ]
            },
            "documents": [
              {
                "description": "Sanction letters indicating number of posts sanctioned by the competent authority (including Management sanctioned posts)",
                "required": false
              },
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              }
            ],
            "nestedPanel": true
          },
          {
            "id": "2.4.2",
            "title": "Percentage of full time teachers with NET/SET/SLET/ Ph. D./D.Sc. / D.Litt./L.L.D. during the last five years (consider only highest degree for count)",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "suffix": "%",
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "2.4.2.1",
            "title": "Number of full time teachers with NET/SET/SLET/Ph. D./ D.Sc. / D.Litt./L.L.D year wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "relatedInput": {
              "label": "Number of teaching staff / full time teachers year wise during the last five years",
              "years": [
                {
                  "year": "Year 1",
                  "value": "43"
                },
                {
                  "year": "Year 2",
                  "value": "35"
                },
                {
                  "year": "Year 3",
                  "value": "20"
                },
                {
                  "year": "Year 4",
                  "value": "24"
                },
                {
                  "year": "Year 5",
                  "value": "17"
                }
              ]
            },
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "List of faculties having Ph. D. / D.Sc. / D.Litt./ L.L.D along with particulars of degree awarding university, subject and the year of award per academic year.",
                "required": false
              },
              {
                "description": "Institution data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/2.1, 2.2 &2.4.2.xlsx"
              },
              {
                "description": "Copies of Ph.D./D.Sc / D.Litt./ L.L.D awareded by UGC recognized universities",
                "required": false
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "2.5",
        "title": "Evaluation Process and Reforms",
        "metrics": [
          {
            "id": "2.5.1",
            "title": "Mechanism of internal/ external assessment is transparent and the grievance redressal system is time- bound and efficient",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false,
                "fileName": "2.5.1_L.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/2.5.1_1689066627_11926.pdf"
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false
          }
        ]
      },
      {
        "id": "2.6",
        "title": "Student Performance and Learning Outcomes",
        "metrics": [
          {
            "id": "2.6.1",
            "title": "Programme Outcomes (POs) and Course Outcomes (COs) for all Programmes offered by the institution are stated and displayed on website",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": false,
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false,
                "fileName": "2.6.1_L.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/2.6.1_1689066632_11926.pdf"
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "nestedPanel": false
          },
          {
            "id": "2.6.2",
            "title": "Attainment of POs and COs are evaluated. Explain with evidence in a maximum of 500 words",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false,
                "fileName": "2.6.2_L.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/2.6.2_1689066637_11926.pdf"
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false
          },
          {
            "id": "2.6.3",
            "title": "Pass percentage of Students during last five years (excluding backlog students)",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "suffix": "%",
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "2.6.3.1",
            "title": "Number of final year students who passed the university examination year wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [],
            "nestedPanel": true
          },
          {
            "id": "2.6.3.2",
            "title": "Number of final year students who appeared for the university examination year-wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/2.6.3.xlsx"
              },
              {
                "description": "Certified report from Controller Examination of the affiliating university indicating pass percentage of students of the final year (final semester) eligible for the degree programwise / year-wise.",
                "required": false
              },
              {
                "description": "Annual report of controller of Examinations(COE) highlighting the pass percentage of final year students",
                "required": false
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "2.7",
        "title": "Student Satisfaction Survey",
        "metrics": [
          {
            "id": "2.7.1",
            "title": "Online student satisfaction survey regarding teaching learning process",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "documents": [
              {
                "description": "Upload database of all students on roll as per data template",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/2.7.1.xlsx"
              }
            ],
            "nestedPanel": false
          }
        ]
      }
    ]
  },
  {
    "id": "3",
    "title": "Research, Innovations and Extension",
    "answeredLabel": "answered: 4/9",
    "subMetrics": [
      {
        "id": "3.1",
        "title": "Resource Mobilization for Research",
        "metrics": [
          {
            "id": "3.1.1",
            "title": "Grants received from Government and non-governmental agencies for research projects / endowments in the institution during the last five years (INR in Lakhs)",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "3.1.1.1",
            "title": "Total Grants from Government and non-governmental agencies for research projects / endowments in the institution during the last five years (INR in Lakhs)",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [
              {
                "description": "Upload supporting document",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/3.1.1.xlsx"
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "3.2",
        "title": "Innovation Ecosystem",
        "metrics": [
          {
            "id": "3.2.1",
            "title": "Institution has created an ecosystem for innovations, Indian Knowledge System (IKS),including awareness about IPR, establishment of IPR cell, Incubation centre and other initiatives for the creation and transfer of knowledge/technology and the outcomes of the same are evident",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": false,
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false,
                "fileName": "3.2.1-LCOP.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/3.2.1_1687772955_11926.pdf"
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "nestedPanel": false
          },
          {
            "id": "3.2.2",
            "title": "Number of workshops/seminars/conferences including on Research Methodology, Intellectual Property Rights (IPR) and entrepreneurship conducted during the last five years",
            "kind": "numeric",
            "defaultValue": "41",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "3.2.2.1",
            "title": "Total number of workshops/seminars/conferences including programs conducted on Research Methodology, Intellectual Property Rights (IPR) and entrepreneurship year wise during last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": "9"
              },
              {
                "year": "2020-21",
                "value": "8"
              },
              {
                "year": "2019-20",
                "value": "9"
              },
              {
                "year": "2018-19",
                "value": "8"
              },
              {
                "year": "2017-18",
                "value": "7"
              }
            ],
            "documents": [
              {
                "description": "Upload supporting document",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/3.2.2.xlsx",
                "fileName": "3.2.2_LCOP.xlsx",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/3.2.2_1688359878_11926.xlsx"
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "3.3",
        "title": "Research Publications and Awards",
        "metrics": [
          {
            "id": "3.3.1",
            "title": "Number of research papers published per teacher in the Journals notified on UGC care list during the last five years",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "3.3.1.1",
            "title": "Number of research papers in the Journals notified on UGC CARE list year wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Link to the uploaded papers, the first page/full paper(with author and affiliation details)on the institutional website",
                "required": false
              },
              {
                "description": "Link to re-directing to journal source-cite website in case of digital journals",
                "required": false
              },
              {
                "description": "Links to the papers published in journals listed in UGC CARE list or",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/3.3.1.xlsx"
              }
            ],
            "nestedPanel": true
          },
          {
            "id": "3.3.2",
            "title": "Number of books and chapters in edited volumes/books published and papers published in national/ international conference proceedings per teacher during last five years",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "3.3.2.1",
            "title": "Total number of books and chapters in edited volumes/books published and papers in national/ international conference proceedings year wise during last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "List of chapter/book along with the links redirecting to the source website",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/3.3.2.xlsx"
              },
              {
                "description": "Copy of the Cover page, content page and first page of the publication indicating ISBN number and year of publication for books/chapters",
                "required": false
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "3.4",
        "title": "Extension Activities",
        "metrics": [
          {
            "id": "3.4.1",
            "title": "Outcomes of Extension activities in the neighborhood community in terms of impact and sensitizing the students to social issues for their holistic development during the last five years.",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false,
                "fileName": "3.4.1.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/3.4.1_1689398606_11926.pdf"
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false
          },
          {
            "id": "3.4.2",
            "title": "Awards and recognitions received for extension activities from government / government recognised bodies",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false,
                "fileName": "3.4.2.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/3.4.2_1688360322_11926.pdf"
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false
          },
          {
            "id": "3.4.3",
            "title": "Number of extension and outreach programs conducted by the institution through organized forums including NSS/NCC with involvement of community during the last five years .",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "3.4.3.1",
            "title": "Number of extension and outreach Programs conducted in collaboration with industry, community, and Non- Government Organizations through NSS/ NCC etc., year wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Photographs and any other supporting document of relevance should have proper captions and dates.",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/3.4.3.xlsx"
              },
              {
                "description": "Detailed report for each extension and outreach program to be made available, with specific mention of number of students participated and the details of the collaborating agency",
                "required": false
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "3.5",
        "title": "Collaboration",
        "metrics": [
          {
            "id": "3.5.1",
            "title": "Number of functional MoUs/linkages with institutions/ industries in India and abroad for internship, on-the-job training, project work, student / faculty exchange and collaborative research during the last five years .",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": false,
            "documents": [
              {
                "description": "Summary of the functional MoUs/linkage/collaboration indicating start date, end date, nature of collaboration etc.",
                "required": false
              },
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "List of year wise activities and exchange should be provided",
                "required": false
              },
              {
                "description": "List and Copies of documents indicating the functional MoUs/linkage/collaborations activity-wise and year-wise",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/3.5.1.xlsx"
              }
            ],
            "nestedPanel": false
          }
        ]
      }
    ]
  },
  {
    "id": "4",
    "title": "Infrastructure and Learning Resources",
    "answeredLabel": "answered: 0/6",
    "subMetrics": [
      {
        "id": "4.1",
        "title": "Physical Facilities",
        "metrics": [
          {
            "id": "4.1.1",
            "title": "The Institution has adequate infrastructure and other facilities for, teaching – learning, viz., classrooms, laboratories, computing equipment etc ICT – enabled facilities such as smart class, LMS etc. Facilities for Cultural and sports activities, yoga centre, games (indoor and outdoor), Gymnasium, auditorium etc (Describe the adequacy of facilities in maximum of 500 words.)",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false
          },
          {
            "id": "4.1.2",
            "title": "Percentage of expenditure for infrastructure development and augmentation excluding salary during the last five years",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "4.1.2.1",
            "title": "Expenditure for infrastructure development and augmentation, excluding salary year wise during last five years (INR in lakhs)",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "relatedInput": {
              "label": "Expenditure excluding salary component year wise during the last five years (INR in lakhs)",
              "years": [
                {
                  "year": "Year 1",
                  "value": "52.92"
                },
                {
                  "year": "Year 2",
                  "value": "48.66"
                },
                {
                  "year": "Year 3",
                  "value": "34.38"
                },
                {
                  "year": "Year 4",
                  "value": "00"
                },
                {
                  "year": "Year 5",
                  "value": "50.04"
                }
              ]
            },
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/4.1.2.xlsx"
              },
              {
                "description": "Audited income and expenditure statement of the institution to be signed by CA for and counter signed by the competent authority (relevant expenditure claimed for infrastructure augmentation should be clearly highlighted)",
                "required": false
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "4.2",
        "title": "Library as a Learning Resource",
        "metrics": [
          {
            "id": "4.2.1",
            "title": "Library is automated with digital facilities using Integrated Library Management System (ILMS), adequate subscriptions to e-resources and journals are made. The library is optimally used by the faculty and students",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false
          }
        ]
      },
      {
        "id": "4.3",
        "title": "IT Infrastructure",
        "metrics": [
          {
            "id": "4.3.1",
            "title": "Institution frequently updates its IT facilities and provides sufficient bandwidth for internet connection Describe IT facilities including Wi-Fi with date and nature of updation, available internet bandwidth within a maximum of 500 words",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false
          },
          {
            "id": "4.3.2",
            "title": "Student – Computer ratio (Data for the latest completed academic year)",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "4.3.2.1",
            "title": "Number of computers available for students usage during the latest completed academic year:",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": false,
            "relatedInput": {
              "label": "Number of students year wise during the last five years",
              "years": [
                {
                  "year": "Year 1",
                  "value": "554"
                },
                {
                  "year": "Year 2",
                  "value": "405"
                },
                {
                  "year": "Year 3",
                  "value": "250"
                },
                {
                  "year": "Year 4",
                  "value": "241"
                },
                {
                  "year": "Year 5",
                  "value": "171"
                }
              ]
            },
            "documents": [
              {
                "description": "Purchased Bills/Copies highlighting the number of computers purchased",
                "required": false
              },
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Extracts stock register/ highlighting the computers issued to respective departments for student’s usage.",
                "required": false
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "4.4",
        "title": "Maintenance of Campus Infrastructure",
        "metrics": [
          {
            "id": "4.4.1",
            "title": "Percentage expenditure incurred on maintenance of physical facilities and academic support facilities excluding salary component, during the last five years (INR in Lakhs)",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "suffix": "%",
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "4.4.1.1",
            "title": "Expenditure incurred on maintenance of infrastructure (physical facilities and academic support facilities) excluding salary component year wise during the last five years (INR in lakhs)",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "relatedInput": {
              "label": "Expenditure excluding salary component year wise during the last five years (INR in lakhs)",
              "years": [
                {
                  "year": "Year 1",
                  "value": "52.92"
                },
                {
                  "year": "Year 2",
                  "value": "48.66"
                },
                {
                  "year": "Year 3",
                  "value": "34.38"
                },
                {
                  "year": "Year 4",
                  "value": "00"
                },
                {
                  "year": "Year 5",
                  "value": "50.04"
                }
              ]
            },
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/4.4.1.xlsx"
              },
              {
                "description": "Audited income and expenditure statement of the institution to be signed by CA for and counter signed by the competent authority (relevant expenditure claimed for maintenance of infrastructure should be clearly highlighted)",
                "required": false
              }
            ],
            "nestedPanel": true
          }
        ]
      }
    ]
  },
  {
    "id": "5",
    "title": "Student Support and Progression",
    "answeredLabel": "answered: 6/9",
    "subMetrics": [
      {
        "id": "5.1",
        "title": "Student Support",
        "metrics": [
          {
            "id": "5.1.1",
            "title": "Percentage of students benefited by scholarships and freeships provided by the institution, government and non-government bodies, industries, individuals, philanthropists during the last five years",
            "kind": "numeric",
            "defaultValue": "71.5",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "5.1.1.1",
            "title": "Number of students benefited by scholarships and freeships provided by the institution, Government and non-government bodies, industries, individuals, philanthropists during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": "369"
              },
              {
                "year": "2020-21",
                "value": "283"
              },
              {
                "year": "2019-20",
                "value": "209"
              },
              {
                "year": "2018-19",
                "value": "158"
              },
              {
                "year": "2017-18",
                "value": "140"
              }
            ],
            "relatedInput": {
              "label": "Number of students year wise during the last five years",
              "years": [
                {
                  "year": "Year 1",
                  "value": "554"
                },
                {
                  "year": "Year 2",
                  "value": "405"
                },
                {
                  "year": "Year 3",
                  "value": "250"
                },
                {
                  "year": "Year 4",
                  "value": "241"
                },
                {
                  "year": "Year 5",
                  "value": "171"
                }
              ]
            },
            "documents": [
              {
                "description": "Year-wise list of beneficiary students in each scheme duly signed by the competent authority.",
                "required": false
              },
              {
                "description": "Upload Sanction letter of scholarship and free ships (along with English translated version if it is in regional language).",
                "required": false
              },
              {
                "description": "Upload policy document of the HEI for award of scholarship and freeships.",
                "required": false
              },
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/5.1.1.xlsx",
                "fileName": "5.1.1_L.xlsx",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/5.1.1_1688976297_11926.xlsx"
              }
            ],
            "nestedPanel": true
          },
          {
            "id": "5.1.2",
            "title": "Following capacity development and skills enhancement activities are organised for improving students’ capability Soft skills Language and communication skills Life skills (Yoga, physical fitness, health and hygiene) ICT/computing skills",
            "kind": "radio",
            "defaultValue": "5096",
            "options": [
              {
                "value": "5096",
                "label": "A. All of the above",
                "checked": true
              },
              {
                "value": "5097",
                "label": "B. 3 of the above",
                "checked": false
              },
              {
                "value": "5098",
                "label": "C. 2 of the above",
                "checked": false
              },
              {
                "value": "5099",
                "label": "D. 1 of the above",
                "checked": false
              },
              {
                "value": "5100",
                "label": "E. None of the above",
                "checked": false
              }
            ],
            "documents": [
              {
                "description": "Report with photographs on Programmes /activities conducted to enhance soft skills, Language and communication skills, and Life skills (Yoga, physical fitness, health and hygiene, self-employment and entrepreneurial skills)",
                "required": false
              },
              {
                "description": "Report with photographs on ICT/computing skills enhancement programs",
                "required": false
              },
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/5.1.2.xlsx",
                "fileName": "5.1.2_Skill enhance programs.xlsx",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/5.1.2_1688461492_11926.xlsx"
              }
            ],
            "nestedPanel": false
          },
          {
            "id": "5.1.3",
            "title": "Percentage of students benefitted by guidance for competitive examinations and career counseling offered by the Institution during the last five years",
            "kind": "numeric",
            "defaultValue": "65.14",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "5.1.3.1",
            "title": "Number of students benefitted by guidance for competitive examinations and career counselling offered by the institution year wise during last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": "260"
              },
              {
                "year": "2020-21",
                "value": "280"
              },
              {
                "year": "2019-20",
                "value": "210"
              },
              {
                "year": "2018-19",
                "value": "220"
              },
              {
                "year": "2017-18",
                "value": "86"
              }
            ],
            "relatedInput": {
              "label": "Number of students year wise during the last five years",
              "years": [
                {
                  "year": "Year 1",
                  "value": "554"
                },
                {
                  "year": "Year 2",
                  "value": "405"
                },
                {
                  "year": "Year 3",
                  "value": "250"
                },
                {
                  "year": "Year 4",
                  "value": "241"
                },
                {
                  "year": "Year 5",
                  "value": "171"
                }
              ]
            },
            "documents": [
              {
                "description": "Upload supporting document",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/5.1.3.xlsx",
                "fileName": "5.1.3_L.xlsx",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/5.1.3_1688462155_11926.xlsx"
              }
            ],
            "nestedPanel": true
          },
          {
            "id": "5.1.4",
            "title": "The institution adopts the following for redressal of student grievances including sexual harassment and ragging cases Implementation of guidelines of statutory/regulatory bodies Organisation wide awareness and undertakings on policies with zero tolerance Mechanisms for submission of online/offline students’ grievances Timely redressal of the grievances through appropriate committees",
            "kind": "radio",
            "defaultValue": "5101",
            "options": [
              {
                "value": "5101",
                "label": "A. All of the above",
                "checked": true
              },
              {
                "value": "5102",
                "label": "B. 3 of the above",
                "checked": false
              },
              {
                "value": "5103",
                "label": "C. 2 of the above",
                "checked": false
              },
              {
                "value": "5104",
                "label": "D. 1 of the above",
                "checked": false
              },
              {
                "value": "5105",
                "label": "E. None of the above",
                "checked": false
              }
            ],
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Proof w.r.t Organisation wide awareness and undertakings on policies with zero tolerance",
                "required": false
              },
              {
                "description": "Proof related to Mechanisms for submission of online/offline students’ grievances",
                "required": false
              },
              {
                "description": "Proof for Implementation of guidelines of statutory/regulatory bodies",
                "required": false
              },
              {
                "description": "Details of statutory/regulatory Committees (to be notified in institutional website also)",
                "required": false
              },
              {
                "description": "Annual report of the committee motioning the activities and number of grievances redressed to prove timely redressal of the grievances",
                "required": false
              }
            ],
            "nestedPanel": false
          }
        ]
      },
      {
        "id": "5.2",
        "title": "Student Progression",
        "metrics": [
          {
            "id": "5.2.1",
            "title": "Percentage of placement of outgoing students and students progressing to higher education during the last five years",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "suffix": "%",
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "5.2.1.1",
            "title": "Number of outgoing students placed and / or progressed to higher education year wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [],
            "nestedPanel": true
          },
          {
            "id": "5.2.1.2",
            "title": "Number of outgoing students year wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Number and List of students placed along with placement details such as name of the company, compensation, etc and links to Placement order(the above list should be available on institutional website)",
                "required": false
              },
              {
                "description": "List of students progressing for Higher Education, with details of program and institution that they are/have enrolled along with links to proof of continuation in higher education.(the above list should be available on institutional website)",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/5.2.1.xlsx"
              }
            ],
            "nestedPanel": true
          },
          {
            "id": "5.2.2",
            "title": "Percentage of students qualifying in state/national/ international level examinations during the last five years",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "5.2.2.1",
            "title": "Number of students qualifying in state/ national/ international level examinations year wise during last five years (eg: IIT/JAM/NET/SLET/GATE/GMAT/GPAT/CLAT/CAT/ GRE/TOEFL/ IELTS/Civil Services/State government examinations etc.)",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "List of students qualified year wise under each category and links to Qualifying Certificates of the students taking the examination",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/5.2.2.xlsx"
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "5.3",
        "title": "Student Participation and Activities",
        "metrics": [
          {
            "id": "5.3.1",
            "title": "Number of awards/medals for outstanding performance in sports/ cultural activities at University / state/ national / international level (award for a team event should be counted as one) during the last five years",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "5.3.1.1",
            "title": "Number of awards/medals for outstanding performance in sports/cultural activities at national/international level (award for a team event should be counted as one) year wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": ""
              },
              {
                "year": "2020-21",
                "value": ""
              },
              {
                "year": "2019-20",
                "value": ""
              },
              {
                "year": "2018-19",
                "value": ""
              },
              {
                "year": "2017-18",
                "value": ""
              }
            ],
            "documents": [
              {
                "description": "Upload supporting document",
                "required": false
              },
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "list and links to e-copies of award letters and certificates",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/5.3.1.xlsx"
              }
            ],
            "nestedPanel": true
          },
          {
            "id": "5.3.2",
            "title": "Average number of sports and cultural programs in which students of the Institution participated during last five years (organised by the institution/other institutions)",
            "kind": "numeric",
            "defaultValue": "2.6",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "5.3.2.1",
            "title": "Number of sports and cultural programs in which students of the Institution participated year wise during last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": "9"
              },
              {
                "year": "2020-21",
                "value": "2"
              },
              {
                "year": "2019-20",
                "value": "2"
              },
              {
                "year": "2018-19",
                "value": "0"
              },
              {
                "year": "2017-18",
                "value": "0"
              }
            ],
            "documents": [
              {
                "description": "Upload supporting document",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/5.3.2.xlsx"
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "5.4",
        "title": "Alumni Engagement",
        "metrics": [
          {
            "id": "5.4.1",
            "title": "There is a registered Alumni Association that contributes significantly to the development of the institution through financial and/or other support services",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false,
                "fileName": "5.4.1_Alumni.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/5.4.1_1688976342_11926.pdf"
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false
          }
        ]
      }
    ]
  },
  {
    "id": "6",
    "title": "Governance, Leadership and Management",
    "answeredLabel": "answered: 7/9",
    "subMetrics": [
      {
        "id": "6.1",
        "title": "Institutional Vision and Leadership",
        "metrics": [
          {
            "id": "6.1.1",
            "title": "The institutional governance and leadership are in accordance with the vision and mission of the Institution and it is visible in various institutional practices such as NEP implementation, sustained institutional growth, decentralization, participation in the institutional governance and in their short term and long term Institutional Perspective Plan.",
            "kind": "richtext",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "hint": "*At least 1 characters and within 500 words",
            "nestedPanel": false
          }
        ]
      },
      {
        "id": "6.2",
        "title": "Strategy Development and Deployment",
        "metrics": [
          {
            "id": "6.2.1",
            "title": "The institutional perspective plan is effectively deployed and functioning of the institutional bodies is effective and efficient as visible from policies, administrative setup, appointment, service rules, and procedures, etc",
            "kind": "textarea",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Institutional perspective Plan and deployment documents on the website",
                "required": false
              }
            ],
            "nestedPanel": false
          },
          {
            "id": "6.2.2",
            "title": "Institution implements e-governance in its operations Administration Finance and Accounts Student Admission and Support Examination",
            "kind": "radio",
            "options": [
              {
                "value": "5106",
                "label": "A. All of the above",
                "checked": false
              },
              {
                "value": "5107",
                "label": "B. 3 of the above",
                "checked": false
              },
              {
                "value": "5108",
                "label": "C. 2 of the above",
                "checked": false
              },
              {
                "value": "5109",
                "label": "D. 1 of the above",
                "checked": false
              },
              {
                "value": "5110",
                "label": "E. None of the above",
                "checked": false
              }
            ],
            "documents": [
              {
                "description": "Screen shots of user interfaces of each module reflecting the name of the HEI",
                "required": false
              },
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Institutional expenditure statements for the budget heads of e-governance implementation ERP Document",
                "required": false
              },
              {
                "description": "Annual e-governance report approved by the Governing Council/ Board of Management/ Syndicate Policy document on e-governance",
                "required": false
              }
            ],
            "nestedPanel": false
          }
        ]
      },
      {
        "id": "6.3",
        "title": "Faculty Empowerment Strategies",
        "metrics": [
          {
            "id": "6.3.1",
            "title": "The institution has performance appraisal system, effective welfare measures for teaching and non-teaching staff and avenues for career development/progression",
            "kind": "textarea",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "nestedPanel": false
          },
          {
            "id": "6.3.2",
            "title": "Percentage of teachers provided with financial support to attend conferences/workshops and towards membership fee of professional bodies during the last five years",
            "kind": "numeric",
            "defaultValue": "80.58",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "6.3.2.1",
            "title": "Number of teachers provided with financial support to attend conferences/workshops and towards membership fee of professional bodies year wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": "35"
              },
              {
                "year": "2020-21",
                "value": "30"
              },
              {
                "year": "2019-20",
                "value": "15"
              },
              {
                "year": "2018-19",
                "value": "18"
              },
              {
                "year": "2017-18",
                "value": "14"
              }
            ],
            "relatedInput": {
              "label": "Number of teaching staff / full time teachers year wise during the last five years",
              "years": [
                {
                  "year": "Year 1",
                  "value": "43"
                },
                {
                  "year": "Year 2",
                  "value": "35"
                },
                {
                  "year": "Year 3",
                  "value": "20"
                },
                {
                  "year": "Year 4",
                  "value": "24"
                },
                {
                  "year": "Year 5",
                  "value": "17"
                }
              ]
            },
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Policy document on providing financial support to teachers",
                "required": false
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/6.3.2.xlsx"
              },
              {
                "description": "Copy of letter/s indicating financial assistance to teachers and list of teachers receiving financial support year-wise under each head.",
                "required": false
              },
              {
                "description": "Audited statement of account highlighting the financial support to teachers to attend conferences / workshop s and towards membership fee for professional bodies",
                "required": false
              }
            ],
            "nestedPanel": true
          },
          {
            "id": "6.3.3",
            "title": "Percentage of teaching and non-teaching staff participating in Faculty development Programmes (FDP), Management Development Programmes (MDPs) professional development /administrative training programs during the last five years",
            "kind": "numeric",
            "defaultValue": "77.4",
            "disabled": true,
            "documents": [],
            "nestedPanel": false
          },
          {
            "id": "6.3.3.1",
            "title": "Total number of teaching and non-teaching staff participating in Faculty development Programmes (FDP), Management Development Programmes (MDPs) professional development /administrative training programs during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": "42"
              },
              {
                "year": "2020-21",
                "value": "34"
              },
              {
                "year": "2019-20",
                "value": "20"
              },
              {
                "year": "2018-19",
                "value": "24"
              },
              {
                "year": "2017-18",
                "value": "17"
              }
            ],
            "documents": [],
            "nestedPanel": true
          },
          {
            "id": "6.3.3.2",
            "title": "Number of non-teaching staff year wise during the last five years",
            "kind": "years",
            "defaultValue": "",
            "years": [
              {
                "year": "2021-22",
                "value": "10"
              },
              {
                "year": "2020-21",
                "value": "10"
              },
              {
                "year": "2019-20",
                "value": "6"
              },
              {
                "year": "2018-19",
                "value": "6"
              },
              {
                "year": "2017-18",
                "value": "6"
              }
            ],
            "relatedInput": {
              "label": "Number of teaching staff / full time teachers year wise during the last five years",
              "years": [
                {
                  "year": "Year 1",
                  "value": "43"
                },
                {
                  "year": "Year 2",
                  "value": "35"
                },
                {
                  "year": "Year 3",
                  "value": "20"
                },
                {
                  "year": "Year 4",
                  "value": "24"
                },
                {
                  "year": "Year 5",
                  "value": "17"
                }
              ]
            },
            "documents": [
              {
                "description": "Refresher course/Faculty Orientation or other programmes as per UGC/AICTE stipulated periods, as participated by teachers year-wise.",
                "required": false
              },
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Institutional data in the prescribed format",
                "required": true,
                "templateLabel": "Data Template",
                "templateHref": "https://assessmentonline.naac.gov.in/storage/app/admin/scheme179/6.3.3.xlsx",
                "fileName": "6.3.3 DT.xlsx",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/6.3.3_1689154515_11926.xlsx"
              },
              {
                "description": "Copy of the certificates of the program attended by teachers.",
                "required": false
              },
              {
                "description": "Annual reports highlighting the programmes undertaken by the teachers",
                "required": false
              }
            ],
            "nestedPanel": true
          }
        ]
      },
      {
        "id": "6.4",
        "title": "Financial Management and Resource Mobilization",
        "metrics": [
          {
            "id": "6.4.1",
            "title": "Institution has strategies for mobilization and optimal utilization of resources and funds from various sources (government/ nongovernment organizations) and it conducts financial audits regularly (internal and external)",
            "kind": "textarea",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "nestedPanel": false
          }
        ]
      },
      {
        "id": "6.5",
        "title": "Internal Quality Assurance System",
        "metrics": [
          {
            "id": "6.5.1",
            "title": "Internal Quality Assurance Cell (IQAC) has contributed significantly for institutionalizing the quality assurance strategies and processes. It reviews teaching learning process, structures & methodologies of operations and learning outcomes at periodic intervals and records the incremental improvement in various activities",
            "kind": "textarea",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "nestedPanel": false
          },
          {
            "id": "6.5.2",
            "title": "Quality assurance initiatives of the institution include: Regular meeting of Internal Quality Assurance Cell (IQAC); quality improvement initiatives identified and implemented Academic and Administrative Audit (AAA) and follow-up action taken Collaborative quality initiatives with other institution(s) Participation in NIRF and other recognized rankings Any other quality audit/accreditation recognized by state, national or international agencies such as NAAC, NBA etc.",
            "kind": "radio",
            "options": [
              {
                "value": "5091",
                "label": "A. Any 4 or more of the above",
                "checked": false
              },
              {
                "value": "5092",
                "label": "B. Any 3 of the above",
                "checked": false
              },
              {
                "value": "5093",
                "label": "C. Any 2 of the above",
                "checked": false
              },
              {
                "value": "5094",
                "label": "D. Any 1 of the above",
                "checked": false
              },
              {
                "value": "5095",
                "label": "E. None of the above",
                "checked": false
              }
            ],
            "documents": [
              {
                "description": "Quality audit reports/certificate as applicable and valid for the assessment period.",
                "required": false
              },
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "NIRF report, AAA report and details on follow up actions",
                "required": false
              },
              {
                "description": "List of Collaborative quality initiatives with other institution(s) along with brochures and geo-tagged photos with caption and date.",
                "required": false
              },
              {
                "description": "Link to Minute of IQAC meetings, hosted on HEI website",
                "required": false,
                "linkInput": true
              }
            ],
            "nestedPanel": false
          }
        ]
      }
    ]
  },
  {
    "id": "7",
    "title": "Institutional Values and Best Practices",
    "answeredLabel": "Number of questions answered: 6/6",
    "subMetrics": [
      {
        "id": "7.1",
        "title": "Institutional Values and Social Responsibilities",
        "metrics": [
          {
            "id": "7.1.1",
            "title": "Institution has initiated the Gender Audit and measures for the promotion of gender equity during the last five years. Describe the gender equity & sensitization in curricular and co-curricular activities, facilities for women on campus etc., within 500 words",
            "kind": "textarea",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "nestedPanel": false
          },
          {
            "id": "7.1.2",
            "title": "The Institution has facilities and initiatives for Alternate sources of energy and energy conservation measures Management of the various types of degradable and nondegradable waste Water conservation Green campus initiatives Disabled-friendly, barrier free environment",
            "kind": "radio",
            "defaultValue": "4506",
            "options": [
              {
                "value": "4510",
                "label": "E. None of the above",
                "checked": false
              },
              {
                "value": "4509",
                "label": "D.1 of the above",
                "checked": false
              },
              {
                "value": "4508",
                "label": "C. 2 of the above",
                "checked": false
              },
              {
                "value": "4507",
                "label": "B. 3 of the above",
                "checked": false
              },
              {
                "value": "4506",
                "label": "A. 4 or All of the above",
                "checked": true
              }
            ],
            "documents": [
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Policy document on the green campus/plastic free campus.",
                "required": false,
                "fileName": "Policy-Documents_LCOP.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/7.1.2_1689398676_11926.pdf"
              },
              {
                "description": "Geo-tagged photographs/videos of the facilities.",
                "required": false,
                "fileName": "GEOTAG PHOTOS - LCOP.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/7.1.2_1689405193_11926.pdf"
              },
              {
                "description": "Circulars and report of activities for the implementation of the initiatives document",
                "required": false,
                "fileName": "7.1.3.4 - beyond the campus B&W ATTESTED LATEST- LCOP.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/7.1.2_1689404347_11926.pdf"
              },
              {
                "description": "Bills for the purchase of equipment’s for the facilities created under this metric",
                "required": false,
                "fileName": "7.1.2-LCOP-BILLS B&W - ATTESTED.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/7.1.2_1689398758_11926.pdf"
              }
            ],
            "nestedPanel": false
          },
          {
            "id": "7.1.3",
            "title": "Quality audits on environment and energy regularly undertaken by the Institution. The institutional environment and energy initiatives are confirmed through the following Green audit / Environment audit Energy audit Clean and green campus initiatives Beyond the campus environmental promotion activities",
            "kind": "radio",
            "defaultValue": "4511",
            "options": [
              {
                "value": "4515",
                "label": "E. None of the above",
                "checked": false
              },
              {
                "value": "4514",
                "label": "D. Any 1 of the above",
                "checked": false
              },
              {
                "value": "4513",
                "label": "C. Any 2 of the above",
                "checked": false
              },
              {
                "value": "4512",
                "label": "B. Any 3 of the above",
                "checked": false
              },
              {
                "value": "4511",
                "label": "A. All of the above",
                "checked": true
              }
            ],
            "documents": [
              {
                "description": "Report on Environmental Promotional activities conducted beyond the campus with geo tagged photographs with caption and date",
                "required": false,
                "fileName": "7.1.3.4 - beyond the campus B&W ATTESTED LATEST- LCOP.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/7.1.3_1689401326_11926.pdf"
              },
              {
                "description": "Provide Links for any other relevant document to support the claim (if any)",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Policy document on environment and energy usage Certificate from the auditing agency",
                "required": false,
                "fileName": "7.1.3 - Policy Document on Environment and Energy Usage - KEDAR KHAMITKER.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/7.1.3_1689403962_11926.pdf"
              },
              {
                "description": "Green audit/environmental audit report from recognized bodies",
                "required": false
              },
              {
                "description": "Certificates of the awards received from recognized agency (if any).",
                "required": false,
                "fileName": "LCOPH_EA&GA 2023_CERTIFICATES.pdf",
                "fileHref": "https://assessmentonline.naac.gov.in/storage/app/hei/SSR/114626/7.1.3_1689403213_11926.pdf"
              }
            ],
            "nestedPanel": false
          },
          {
            "id": "7.1.4",
            "title": "Describe the Institutional efforts/initiatives in providing an inclusive environment i.e., tolerance and harmony towards cultural, regional, linguistic, communal socioeconomic and Sensitization of students and employees to the constitutional obligations: values, rights, duties and responsibilities of citizens (Within 500 words)",
            "kind": "textarea",
            "documents": [
              {
                "description": "Upload Additional information",
                "required": false
              },
              {
                "description": "Provide Link for Additional information",
                "required": false,
                "linkInput": true
              }
            ],
            "nestedPanel": false
          }
        ]
      },
      {
        "id": "7.2",
        "title": "Best Practices",
        "metrics": [
          {
            "id": "7.2.1",
            "title": "Describe two best practices successfully implemented by the Institution as per NAAC format provided in the Manual",
            "kind": "textarea",
            "documents": [
              {
                "description": "Best practices as hosted on the Institutional website",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Any other relevant information",
                "required": false,
                "linkInput": true
              }
            ],
            "nestedPanel": false
          }
        ]
      },
      {
        "id": "7.3",
        "title": "Institutional Distinctiveness",
        "metrics": [
          {
            "id": "7.3.1",
            "title": "Portray the performance of the Institution in one area distinctive to its priority and thrust within 1000 words",
            "kind": "numeric",
            "defaultValue": "",
            "disabled": false,
            "documents": [
              {
                "description": "Appropriate web in the Institutional website",
                "required": false,
                "linkInput": true
              },
              {
                "description": "Any other relevant information",
                "required": false,
                "linkInput": true
              }
            ],
            "nestedPanel": false
          }
        ]
      }
    ]
  }
];
