/**
 * Angular `staff-naac/ssr-executive-summary` scraped CKEditor content (Latur
 * College of Pharmacy demo data). Rendered as editable textareas — the old
 * portal AJAX endpoints (`executivesummary`) require the external NAAC
 * `APP_URL` and are not wired up, so Save is local-only.
 */

export const SSR_INTRO_DEFAULTS = {
  introduction:
    "In 2015, the Latur College of Pharmacy Hasegaon was established. The institution was founded with the intention of providing ambitious students with an exceptional education. Our commitment to diversity and inclusiveness is reflected in our pursuit of excellence, creativity, and innovation. The campus is surrounded by a quiet environment, with a play field and well-built infrastructure inside the main campus providing a pollution-free, scenic, lush green setting conducive to excellent education and research.\n\nThe primary objective of the institute is to provide pharmaceutical education that is of the highest quality and meets international standards. Similarly, the educational institution provides courses with added value, such as professional ethics and human values, pharmacovigilance, clinical data administration, industry-focused faculty training programmes, and other skill development programmes. The college's student-to-faculty ratio is 15 to 1.",
  vision:
    "- To develop an internationally recognized center for excellence of pharmaceutical education and research in the Country.\n- To form the curriculum so as to give maximum exposure to students with regard to the latest development in technology and trends within the pharmaceutical industry.\n- To supplement the academics with maximum practical applications of theoretical knowledge.\n- To be a world class Institution of Pharmaceutical Science and Technology in the state and in the country as a whole.\n- To train and prepare a high class pharmaceutical professionals for global competitiveness.\n- To ensure high quality of education to students of all sections of the society at affordable cost.",
  mission:
    "The mission of the college is \u201CLearn to live\u201D — a dignified life by providing high quality technical education to contribute to the nation and the world at large with responsible, wise, passionate and efficient pharmaceutical professionals for the betterment of human beings.\n\n- To facilitate world class technical education through quality institution having academic excellence and innovative research and developmental programs.\n- To help technology forecasting and global manpower planning.\n- To inculcate entrepreneurship by providing industry-institute interaction.\n- To provide affordable technical education to all.\n- To facilitate learning in respect of all branches of pharmaceutical sciences.",
};

export type SsrCriterion = { id: string; title: string; defaultText: string };

export const SSR_CRITERIA_SUMMARY: SsrCriterion[] = [
  {
    id: "criteria_sum0",
    title: "Curricular Aspects",
    defaultText:
      "Since 2015, Latur College of Pharmacy Hasegaon has adhered to a university-designed B.Pharmacy curriculum. The institute's courses and programs were designed to address local, national, and international development requirements. The curriculum is supplemented by pedagogical initiatives such as supportive theory/practical topics, skill development courses, certificate courses, communication skills, soft skills, entrepreneurial skills, gender equality, environment and sustainability, and professional ethics and human values, all approved by boards of studies and academic council.",
  },
  {
    id: "criteria_sum1",
    title: "Teaching-learning and Evaluation",
    defaultText:
      "The Institute employs a comprehensive approach to instruction, learning, and evaluation, implementing numerous innovative teaching and learning methods including orientation programmes, flipped classes, video lectures, skill-oriented programmes, problem-based learning, student-assisted teaching, collaborative learning, quizzes, and group discussions. The institution has developed innovative evaluation procedures that incorporate formative and summative assessment of student performance over the course of the academic year.",
  },
  {
    id: "criteria_sum2",
    title: "Research, Innovations and Extension",
    defaultText:
      "The institute's research facilities are renovated frequently, and the Research Advisory Board closely monitors research activities. The institute has a recognized research centre, an Authorized Drug Testing Laboratory, and a central animal house facility. In the past five years, 80 articles have been published in UGC-notified journals, 100 book chapters have been written, and 40 seminars/workshops on IPR/Research activities have been held.",
  },
  {
    id: "criteria_sum3",
    title: "Infrastructure and Learning Resources",
    defaultText:
      "The Institute's 12 laboratories are outfitted with the technology required for teaching and learning across all programs, as well as for research, formulation and analysis of pharmaceutical products, and development of nutraceuticals. The institution has a well-established drug museum and a herb garden containing over a hundred rare and economically valuable medicinal herbs.",
  },
  {
    id: "criteria_sum4",
    title: "Student Support and Progression",
    defaultText:
      "Nearly ninety percent of the institution's students are enrolled in at least one of its programs, more than fifty percent receive financial assistance in the form of scholarships. The institution has a mentor-mentee system in place to provide students with support and guidance in academics, research, and extracurricular and social activities, along with an online feedback mechanism for all programs.",
  },
  {
    id: "criteria_sum5",
    title: "Governance, Leadership and Management",
    defaultText:
      "Management, the institution's principal, the Institutional Quality Assurance Committee, and other personnel share responsibility for the institution's organizational structure and governance. The Governing Body, the Academic Council, and the Board of Studies occupy the highest administrative positions, devising rules and regulations for academic and administrative functions in line with the institute's vision and mission.",
  },
  {
    id: "criteria_sum6",
    title: "Institutional Values and Best Practices",
    defaultText:
      "Since academic year 2015, the curriculum of the institute has been supplemented with a course entitled Professional ethics and human values. The institute promotes best practices such as 100% attendance awards, best library utilisation awards, industrial training by faculty, academic excellence awards, memorial awards, and pharma science exhibitions to enhance the quality of education and the teaching-learning process.",
  },
];

export const SSR_SWOC_DEFAULTS = {
  strength:
    "The institution is situated in a beautiful, luxuriantly green, pollution-free area that is ideal for high-quality education and research. In the past five years, 90.16 percent of students have enrolled in at least one program at the institution, with 88.22 percent belonging to an underrepresented group (SC, ST, or OBC). The ratio of students to faculty and personnel at the institution is 15 to 1.",
  weakness:
    "There are fewer national fellowships awarded to faculty members of the institution by the government and other government-recognised organisations. The organization is required to develop its own MOOCs. It is essential to maintain and expand international student exchange programs and memoranda of understanding.",
  opportunities:
    "Introduction of multidisciplinary courses whose syllabi have been reviewed and authorized. Several industry and R&D entities are collaborating on a study. Accreditation of Laboratories through Formerly Registered Bodies, Such as NABL. Collaboration programs between local, national, and international academic institutions.",
  challenges:
    "Increase the school's efforts to provide career guidance and placement for students. More students should be exposed to vocational and postgraduate diploma programs to promote entrepreneurship and enhance their employability. Government agencies that support significant scientific endeavors financially.",
};

export const SSR_CONCLUSION_DEFAULTS = {
  additionalInfo:
    "Student Assistance Programs: The institution has a tradition of awarding Rs 5,000/- scholarships to students who have earned the highest academic grades. Throughout their education, students are actively encouraged to engage in hands-on, problem-solving activities such as minor research projects. The college has a coaching cell for competitive exams such as GPAT, GRE and others.",
  conclusion:
    "The campus's provision of state-of-the-art facilities, amenities, and numerous other support services has contributed to the growth of both its student body and its faculty and staff. The institution's research efforts, industry-academia interaction, extension and outreach programs have fostered a research culture. As part of its commitment to superior performance, the Institute has set its sights on achieving even greater heights in the coming years.",
};
