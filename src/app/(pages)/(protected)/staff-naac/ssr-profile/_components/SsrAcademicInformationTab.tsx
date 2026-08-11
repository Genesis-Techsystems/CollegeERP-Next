"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { toastError, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import { saveSsrAcademicInfo } from "@/services";
import {
  NaacBorderedTable,
  NaacDefaultPanel,
  NaacPrimaryPanel,
  NaacTd,
  NaacTh,
} from "../../_components/NaacSection";
import {
  SSR_MEDIUM_OF_INSTRUCTION,
  SSR_PROGRAMS_OFFERED_DEFAULT,
  type ProgramOfferedRow,
} from "../../_data/ssr-profile-data";
import {
  ADMITTED_CATEGORIES,
  ENROLLMENT_PROGRAMS,
  QUALIFICATION_LEVELS,
  SSR_OTHER_STAFF_POSITIONS_DEFAULT,
  SSR_PART_TIME_TEACHERS_QUALIFICATIONS_DEFAULT,
  SSR_PERMANENT_TEACHERS_QUALIFICATIONS_DEFAULT,
  SSR_PROVIDE_DETAILS_DEFAULT,
  SSR_STUDENTS_ADMITTED_MATRIX_DEFAULT,
  SSR_STUDENT_ENROLLMENT_MATRIX_DEFAULT,
  SSR_TEACHING_FACULTY_POSITIONS_DEFAULT,
  SSR_TEMPORARY_TEACHERS_QUALIFICATIONS_DEFAULT,
  SSR_VISITING_FACULTY_DEFAULT,
  TEACHING_DESIGNATIONS,
  sum,
  yetToRecruit,
  type AdmittedCategory,
  type AdmittedMatrix,
  type AdmittedYearCounts,
  type EnrollmentMatrix,
  type EnrollmentProgram,
  type EnrollmentSourceCounts,
  type MFOFields,
  type OtherStaffPositions,
  type ProvideDetailsForm,
  type QualificationLevel,
  type QualificationMatrix,
  type TeachingDesignation,
  type TeachingFacultyPositions,
  type VisitingFacultyForm,
} from "../../_data/ssr-academic-data";

const nativeSelectClass =
  "w-full rounded border border-[#ccc] px-2 py-1.5 text-sm";

const matrixInputClass =
  "h-8 rounded-sm border-black px-1 py-0.5 text-center text-xs";
const matrixReadonlyClass = cn(
  matrixInputClass,
  "bg-muted/70 text-muted-foreground",
);

type Gender = "male" | "female" | "others";
const GENDERS: Gender[] = ["male", "female", "others"];

/** Angular `clg_table3`/`4`/`5`/`6`/`7`/`8`/`10` + `cat_table` — dense black-bordered matrix cell. */
function MatrixTd({
  children,
  className,
  colSpan,
  rowSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <td
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn("border border-black p-1 align-middle text-xs", className)}
    >
      {children}
    </td>
  );
}

function MatrixTh({
  children,
  className,
  colSpan,
  rowSpan,
}: {
  children?: ReactNode;
  className?: string;
  colSpan?: number;
  rowSpan?: number;
}) {
  return (
    <th
      colSpan={colSpan}
      rowSpan={rowSpan}
      className={cn(
        "border border-black bg-[#DCDCDC] px-1 py-1 text-xs font-semibold text-[#333]",
        className,
      )}
    >
      {children}
    </th>
  );
}

/** Angular `clg_table3` — Teaching Faculty position matrix (Professor / Associate / Assistant). */
function TeachingFacultyPositionsTable({
  value,
  onChange,
}: {
  value: TeachingFacultyPositions;
  onChange: (next: TeachingFacultyPositions) => void;
}) {
  const recruitedTotal = (
    d: TeachingDesignation,
    kind: "recruitedUgc" | "recruitedManagement",
  ) => {
    const row = value[kind][d];
    return sum(row.male, row.female, row.others);
  };

  const updateSanctioned = (
    kind: "sanctionedUgc" | "sanctionedManagement",
    d: TeachingDesignation,
    v: string,
  ) => {
    onChange({ ...value, [kind]: { ...value[kind], [d]: v } });
  };

  const updateRecruited = (
    kind: "recruitedUgc" | "recruitedManagement",
    d: TeachingDesignation,
    field: keyof MFOFields,
    v: string,
  ) => {
    onChange({
      ...value,
      [kind]: { ...value[kind], [d]: { ...value[kind][d], [field]: v } },
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-collapse border border-black text-center text-xs">
        <thead>
          <tr>
            <MatrixTh />
            {TEACHING_DESIGNATIONS.map((d) => (
              <MatrixTh key={d.key} colSpan={4}>
                {d.label}
              </MatrixTh>
            ))}
          </tr>
          <tr>
            <MatrixTh />
            {TEACHING_DESIGNATIONS.map((d) => (
              <Fragment key={d.key}>
                <MatrixTh>Male</MatrixTh>
                <MatrixTh>Female</MatrixTh>
                <MatrixTh>Others</MatrixTh>
                <MatrixTh>Total</MatrixTh>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <MatrixTd className="text-left font-medium">
              Sanctioned by the UGC /University State Government
            </MatrixTd>
            {TEACHING_DESIGNATIONS.map((d) => (
              <MatrixTd key={d.key} colSpan={4}>
                <Input
                  className={matrixInputClass}
                  maxLength={4}
                  inputMode="numeric"
                  value={value.sanctionedUgc[d.key]}
                  onChange={(e) =>
                    updateSanctioned("sanctionedUgc", d.key, e.target.value)
                  }
                />
              </MatrixTd>
            ))}
          </tr>
          <tr>
            <MatrixTd className="text-left font-medium">Recruited</MatrixTd>
            {TEACHING_DESIGNATIONS.map((d) => {
              const row = value.recruitedUgc[d.key];
              return (
                <Fragment key={d.key}>
                  <MatrixTd>
                    <Input
                      className={matrixInputClass}
                      maxLength={4}
                      inputMode="numeric"
                      value={row.male}
                      onChange={(e) =>
                        updateRecruited(
                          "recruitedUgc",
                          d.key,
                          "male",
                          e.target.value,
                        )
                      }
                    />
                  </MatrixTd>
                  <MatrixTd>
                    <Input
                      className={matrixInputClass}
                      maxLength={4}
                      inputMode="numeric"
                      value={row.female}
                      onChange={(e) =>
                        updateRecruited(
                          "recruitedUgc",
                          d.key,
                          "female",
                          e.target.value,
                        )
                      }
                    />
                  </MatrixTd>
                  <MatrixTd>
                    <Input
                      className={matrixInputClass}
                      maxLength={4}
                      inputMode="numeric"
                      value={row.others}
                      onChange={(e) =>
                        updateRecruited(
                          "recruitedUgc",
                          d.key,
                          "others",
                          e.target.value,
                        )
                      }
                    />
                  </MatrixTd>
                  <MatrixTd>
                    <Input
                      className={matrixReadonlyClass}
                      readOnly
                      value={sum(row.male, row.female, row.others)}
                    />
                  </MatrixTd>
                </Fragment>
              );
            })}
          </tr>
          <tr>
            <MatrixTd className="text-left font-medium">
              Yet to Recruit
            </MatrixTd>
            {TEACHING_DESIGNATIONS.map((d) => (
              <MatrixTd key={d.key} colSpan={4}>
                <Input
                  className={matrixReadonlyClass}
                  readOnly
                  value={yetToRecruit(
                    value.sanctionedUgc[d.key],
                    recruitedTotal(d.key, "recruitedUgc"),
                  )}
                />
              </MatrixTd>
            ))}
          </tr>
          <tr>
            <MatrixTd className="text-left font-medium">
              Sanctioned by the Management/Society or Other Authorized Bodies
            </MatrixTd>
            {TEACHING_DESIGNATIONS.map((d) => (
              <MatrixTd key={d.key} colSpan={4}>
                <Input
                  className={matrixInputClass}
                  maxLength={4}
                  inputMode="numeric"
                  value={value.sanctionedManagement[d.key]}
                  onChange={(e) =>
                    updateSanctioned(
                      "sanctionedManagement",
                      d.key,
                      e.target.value,
                    )
                  }
                />
              </MatrixTd>
            ))}
          </tr>
          <tr>
            <MatrixTd className="text-left font-medium">Recruited</MatrixTd>
            {TEACHING_DESIGNATIONS.map((d) => {
              const row = value.recruitedManagement[d.key];
              return (
                <Fragment key={d.key}>
                  <MatrixTd>
                    <Input
                      className={matrixInputClass}
                      maxLength={4}
                      inputMode="numeric"
                      value={row.male}
                      onChange={(e) =>
                        updateRecruited(
                          "recruitedManagement",
                          d.key,
                          "male",
                          e.target.value,
                        )
                      }
                    />
                  </MatrixTd>
                  <MatrixTd>
                    <Input
                      className={matrixInputClass}
                      maxLength={4}
                      inputMode="numeric"
                      value={row.female}
                      onChange={(e) =>
                        updateRecruited(
                          "recruitedManagement",
                          d.key,
                          "female",
                          e.target.value,
                        )
                      }
                    />
                  </MatrixTd>
                  <MatrixTd>
                    <Input
                      className={matrixInputClass}
                      maxLength={4}
                      inputMode="numeric"
                      value={row.others}
                      onChange={(e) =>
                        updateRecruited(
                          "recruitedManagement",
                          d.key,
                          "others",
                          e.target.value,
                        )
                      }
                    />
                  </MatrixTd>
                  <MatrixTd>
                    <Input
                      className={matrixReadonlyClass}
                      readOnly
                      value={sum(row.male, row.female, row.others)}
                    />
                  </MatrixTd>
                </Fragment>
              );
            })}
          </tr>
          <tr>
            <MatrixTd className="text-left font-medium">
              Yet to Recruit
            </MatrixTd>
            {TEACHING_DESIGNATIONS.map((d) => (
              <MatrixTd key={d.key} colSpan={4}>
                <Input
                  className={matrixReadonlyClass}
                  readOnly
                  value={yetToRecruit(
                    value.sanctionedManagement[d.key],
                    recruitedTotal(d.key, "recruitedManagement"),
                  )}
                />
              </MatrixTd>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Angular `clg_table4` (Non-Teaching Staff) / `clg_table5` (Technical Staff) — shared shape. */
function OtherStaffPositionsTable({
  value,
  onChange,
}: {
  value: OtherStaffPositions;
  onChange: (next: OtherStaffPositions) => void;
}) {
  const recruitedUgcTotal = sum(
    value.recruitedUgc.male,
    value.recruitedUgc.female,
    value.recruitedUgc.others,
  );
  const recruitedManagementTotal = sum(
    value.recruitedManagement.male,
    value.recruitedManagement.female,
    value.recruitedManagement.others,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse border border-black text-center text-xs">
        <thead>
          <tr>
            <MatrixTh colSpan={2} />
            <MatrixTh>Male</MatrixTh>
            <MatrixTh>Female</MatrixTh>
            <MatrixTh>Others</MatrixTh>
            <MatrixTh>Total</MatrixTh>
          </tr>
        </thead>
        <tbody>
          <tr>
            <MatrixTd colSpan={2} className="text-left font-medium">
              Sanctioned by the UGC /University State Government
            </MatrixTd>
            <MatrixTd />
            <MatrixTd />
            <MatrixTd />
            <MatrixTd>
              <Input
                className={matrixInputClass}
                maxLength={4}
                inputMode="numeric"
                value={value.sanctionedUgcTotal}
                onChange={(e) =>
                  onChange({ ...value, sanctionedUgcTotal: e.target.value })
                }
              />
            </MatrixTd>
          </tr>
          <tr>
            <MatrixTd colSpan={2} className="text-left font-medium">
              Recruited
            </MatrixTd>
            <MatrixTd>
              <Input
                className={matrixInputClass}
                maxLength={4}
                inputMode="numeric"
                value={value.recruitedUgc.male}
                onChange={(e) =>
                  onChange({
                    ...value,
                    recruitedUgc: {
                      ...value.recruitedUgc,
                      male: e.target.value,
                    },
                  })
                }
              />
            </MatrixTd>
            <MatrixTd>
              <Input
                className={matrixInputClass}
                maxLength={4}
                inputMode="numeric"
                value={value.recruitedUgc.female}
                onChange={(e) =>
                  onChange({
                    ...value,
                    recruitedUgc: {
                      ...value.recruitedUgc,
                      female: e.target.value,
                    },
                  })
                }
              />
            </MatrixTd>
            <MatrixTd>
              <Input
                className={matrixInputClass}
                maxLength={4}
                inputMode="numeric"
                value={value.recruitedUgc.others}
                onChange={(e) =>
                  onChange({
                    ...value,
                    recruitedUgc: {
                      ...value.recruitedUgc,
                      others: e.target.value,
                    },
                  })
                }
              />
            </MatrixTd>
            <MatrixTd>
              <Input
                className={matrixReadonlyClass}
                readOnly
                value={recruitedUgcTotal}
              />
            </MatrixTd>
          </tr>
          <tr>
            <MatrixTd colSpan={2} className="text-left font-medium">
              Yet to Recruit
            </MatrixTd>
            <MatrixTd />
            <MatrixTd />
            <MatrixTd />
            <MatrixTd>
              <Input
                className={matrixReadonlyClass}
                readOnly
                value={yetToRecruit(
                  value.sanctionedUgcTotal,
                  recruitedUgcTotal,
                )}
              />
            </MatrixTd>
          </tr>
          <tr>
            <MatrixTd colSpan={2} className="text-left font-medium">
              Sanctioned by the Management/Society or Other Authorized Bodies
            </MatrixTd>
            <MatrixTd />
            <MatrixTd />
            <MatrixTd />
            <MatrixTd>
              <Input
                className={matrixInputClass}
                maxLength={4}
                inputMode="numeric"
                value={value.sanctionedManagementTotal}
                onChange={(e) =>
                  onChange({
                    ...value,
                    sanctionedManagementTotal: e.target.value,
                  })
                }
              />
            </MatrixTd>
          </tr>
          <tr>
            <MatrixTd colSpan={2} className="text-left font-medium">
              Recruited
            </MatrixTd>
            <MatrixTd>
              <Input
                className={matrixInputClass}
                maxLength={4}
                inputMode="numeric"
                value={value.recruitedManagement.male}
                onChange={(e) =>
                  onChange({
                    ...value,
                    recruitedManagement: {
                      ...value.recruitedManagement,
                      male: e.target.value,
                    },
                  })
                }
              />
            </MatrixTd>
            <MatrixTd>
              <Input
                className={matrixInputClass}
                maxLength={4}
                inputMode="numeric"
                value={value.recruitedManagement.female}
                onChange={(e) =>
                  onChange({
                    ...value,
                    recruitedManagement: {
                      ...value.recruitedManagement,
                      female: e.target.value,
                    },
                  })
                }
              />
            </MatrixTd>
            <MatrixTd>
              <Input
                className={matrixInputClass}
                maxLength={4}
                inputMode="numeric"
                value={value.recruitedManagement.others}
                onChange={(e) =>
                  onChange({
                    ...value,
                    recruitedManagement: {
                      ...value.recruitedManagement,
                      others: e.target.value,
                    },
                  })
                }
              />
            </MatrixTd>
            <MatrixTd>
              <Input
                className={matrixReadonlyClass}
                readOnly
                value={recruitedManagementTotal}
              />
            </MatrixTd>
          </tr>
          <tr>
            <MatrixTd colSpan={2} className="text-left font-medium">
              Yet to Recruit
            </MatrixTd>
            <MatrixTd />
            <MatrixTd />
            <MatrixTd />
            <MatrixTd>
              <Input
                className={matrixReadonlyClass}
                readOnly
                value={yetToRecruit(
                  value.sanctionedManagementTotal,
                  recruitedManagementTotal,
                )}
              />
            </MatrixTd>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** Angular `clg_table6`/`7`/`8` — Qualification Details of the Teaching Staff. */
function QualificationTable({
  title,
  value,
  onChange,
}: {
  title: string;
  value: QualificationMatrix;
  onChange: (next: QualificationMatrix) => void;
}) {
  const updateCell = (
    level: QualificationLevel,
    designation: TeachingDesignation,
    field: keyof MFOFields,
    v: string,
  ) => {
    onChange({
      ...value,
      [level]: {
        ...value[level],
        [designation]: { ...value[level][designation], [field]: v },
      },
    });
  };

  const rowTotal = (level: QualificationLevel) => {
    const row = value[level];
    return sum(
      row.professor.male,
      row.professor.female,
      row.professor.others,
      row.associateProfessor.male,
      row.associateProfessor.female,
      row.associateProfessor.others,
      row.assistantProfessor.male,
      row.assistantProfessor.female,
      row.assistantProfessor.others,
    );
  };

  return (
    <div>
      <p className="mb-1 text-center text-sm font-bold text-[#333]">{title}</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse border border-black text-center text-xs">
          <thead>
            <tr>
              <MatrixTh rowSpan={2} className="text-left">
                Highest Qualification
              </MatrixTh>
              {TEACHING_DESIGNATIONS.map((d) => (
                <MatrixTh key={d.key} colSpan={3}>
                  {d.label}
                </MatrixTh>
              ))}
              <MatrixTh rowSpan={2}>Total</MatrixTh>
            </tr>
            <tr>
              {TEACHING_DESIGNATIONS.map((d) => (
                <Fragment key={d.key}>
                  <MatrixTh>Male</MatrixTh>
                  <MatrixTh>Female</MatrixTh>
                  <MatrixTh>Others</MatrixTh>
                </Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {QUALIFICATION_LEVELS.map((level) => (
              <tr key={level.key}>
                <MatrixTd className="text-left">{level.label}</MatrixTd>
                {TEACHING_DESIGNATIONS.map((d) => {
                  const cell = value[level.key][d.key];
                  return (
                    <Fragment key={d.key}>
                      <MatrixTd>
                        <Input
                          className={matrixInputClass}
                          maxLength={4}
                          inputMode="numeric"
                          value={cell.male}
                          onChange={(e) =>
                            updateCell(level.key, d.key, "male", e.target.value)
                          }
                        />
                      </MatrixTd>
                      <MatrixTd>
                        <Input
                          className={matrixInputClass}
                          maxLength={4}
                          inputMode="numeric"
                          value={cell.female}
                          onChange={(e) =>
                            updateCell(
                              level.key,
                              d.key,
                              "female",
                              e.target.value,
                            )
                          }
                        />
                      </MatrixTd>
                      <MatrixTd>
                        <Input
                          className={matrixInputClass}
                          maxLength={4}
                          inputMode="numeric"
                          value={cell.others}
                          onChange={(e) =>
                            updateCell(
                              level.key,
                              d.key,
                              "others",
                              e.target.value,
                            )
                          }
                        />
                      </MatrixTd>
                    </Fragment>
                  );
                })}
                <MatrixTd>
                  <Input
                    className={matrixReadonlyClass}
                    readOnly
                    value={rowTotal(level.key)}
                  />
                </MatrixTd>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Angular `clg_table10` — Students Enrolled Current Academic Year. */
function StudentEnrollmentTable({
  value,
  onChange,
}: {
  value: EnrollmentMatrix;
  onChange: (next: EnrollmentMatrix) => void;
}) {
  const updateCell = (
    program: EnrollmentProgram,
    gender: Gender,
    field: keyof EnrollmentSourceCounts,
    v: string,
  ) => {
    onChange({
      ...value,
      [program]: {
        ...value[program],
        [gender]: { ...value[program][gender], [field]: v },
      },
    });
  };

  const rowTotal = (row: EnrollmentSourceCounts) =>
    sum(row.state, row.otherState, row.nri, row.foreign);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[760px] border-collapse border border-black text-center text-xs">
        <thead>
          <tr>
            <MatrixTh colSpan={2}>Program</MatrixTh>
            <MatrixTh>From the State Where College is Located</MatrixTh>
            <MatrixTh>From Other States of India</MatrixTh>
            <MatrixTh>NRI Students</MatrixTh>
            <MatrixTh>Foreign Students</MatrixTh>
            <MatrixTh>Total</MatrixTh>
          </tr>
        </thead>
        <tbody>
          {ENROLLMENT_PROGRAMS.map((program) => (
            <Fragment key={program.key}>
              {GENDERS.map((gender, idx) => {
                const row = value[program.key][gender];
                return (
                  <tr key={gender}>
                    {idx === 0 ? (
                      <MatrixTd rowSpan={3} className="font-medium">
                        {program.label}
                      </MatrixTd>
                    ) : null}
                    <MatrixTd className="text-left capitalize">
                      {gender}
                    </MatrixTd>
                    <MatrixTd>
                      <Input
                        className={matrixInputClass}
                        maxLength={7}
                        inputMode="numeric"
                        value={row.state}
                        onChange={(e) =>
                          updateCell(
                            program.key,
                            gender,
                            "state",
                            e.target.value,
                          )
                        }
                      />
                    </MatrixTd>
                    <MatrixTd>
                      <Input
                        className={matrixInputClass}
                        maxLength={7}
                        inputMode="numeric"
                        value={row.otherState}
                        onChange={(e) =>
                          updateCell(
                            program.key,
                            gender,
                            "otherState",
                            e.target.value,
                          )
                        }
                      />
                    </MatrixTd>
                    <MatrixTd>
                      <Input
                        className={matrixInputClass}
                        maxLength={7}
                        inputMode="numeric"
                        value={row.nri}
                        onChange={(e) =>
                          updateCell(program.key, gender, "nri", e.target.value)
                        }
                      />
                    </MatrixTd>
                    <MatrixTd>
                      <Input
                        className={matrixInputClass}
                        maxLength={7}
                        inputMode="numeric"
                        value={row.foreign}
                        onChange={(e) =>
                          updateCell(
                            program.key,
                            gender,
                            "foreign",
                            e.target.value,
                          )
                        }
                      />
                    </MatrixTd>
                    <MatrixTd>
                      <Input
                        className={matrixReadonlyClass}
                        readOnly
                        value={rowTotal(row)}
                      />
                    </MatrixTd>
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const ADMITTED_YEAR_KEYS = ["year1", "year2", "year3", "year4"] as const;

/** Angular `cat_table` — Students admitted during the last four academic years. */
function AdmittedYearsTable({
  value,
  onChange,
}: {
  value: AdmittedMatrix;
  onChange: (next: AdmittedMatrix) => void;
}) {
  const updateCell = (
    category: AdmittedCategory,
    gender: Gender,
    yearKey: keyof AdmittedYearCounts,
    v: string,
  ) => {
    onChange({
      ...value,
      [category]: {
        ...value[category],
        [gender]: { ...value[category][gender], [yearKey]: v },
      },
    });
  };

  const yearTotal = (yearKey: keyof AdmittedYearCounts) => {
    const vals: string[] = [];
    ADMITTED_CATEGORIES.forEach((c) => {
      GENDERS.forEach((g) => vals.push(value[c.key][g][yearKey]));
    });
    return sum(...vals);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse border border-black text-center text-xs">
        <thead>
          <tr>
            <MatrixTh colSpan={2}>Category</MatrixTh>
            <MatrixTh>Year 1</MatrixTh>
            <MatrixTh>Year 2</MatrixTh>
            <MatrixTh>Year 3</MatrixTh>
            <MatrixTh>Year 4</MatrixTh>
          </tr>
        </thead>
        <tbody>
          {ADMITTED_CATEGORIES.map((category) => (
            <Fragment key={category.key}>
              {GENDERS.map((gender, idx) => {
                const row = value[category.key][gender];
                return (
                  <tr key={gender}>
                    {idx === 0 ? (
                      <MatrixTd rowSpan={3} className="font-medium">
                        {category.label}
                      </MatrixTd>
                    ) : null}
                    <MatrixTd className="text-left capitalize">
                      {gender}
                    </MatrixTd>
                    {ADMITTED_YEAR_KEYS.map((yearKey) => (
                      <MatrixTd key={yearKey}>
                        <Input
                          className={matrixInputClass}
                          maxLength={7}
                          inputMode="numeric"
                          value={row[yearKey]}
                          onChange={(e) =>
                            updateCell(
                              category.key,
                              gender,
                              yearKey,
                              e.target.value,
                            )
                          }
                        />
                      </MatrixTd>
                    ))}
                  </tr>
                );
              })}
            </Fragment>
          ))}
          <tr>
            <MatrixTd colSpan={2} className="text-left font-semibold">
              Total
            </MatrixTd>
            {ADMITTED_YEAR_KEYS.map((yearKey) => (
              <MatrixTd key={yearKey}>
                <Input
                  className={matrixReadonlyClass}
                  readOnly
                  value={yearTotal(yearKey)}
                />
              </MatrixTd>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

const designationIndex: Record<TeachingDesignation, number> = {
  professor: 1,
  associateProfessor: 2,
  assistantProfessor: 3,
};

const qualificationLevelIndex: Record<QualificationLevel, number> = {
  dsclitt: 1,
  phd: 2,
  mphil: 3,
  pg: 4,
};

const enrollmentProgramIndex: Record<EnrollmentProgram, number> = {
  ug: 1,
  pg: 2,
  diploma: 3,
};

const admittedCategoryIndex: Record<AdmittedCategory, number> = {
  sc: 1,
  st: 2,
  obc: 3,
  general: 4,
  others: 5,
};

const genderNumber: Record<Gender, number> = { male: 1, female: 2, others: 3 };
const genderLetter: Record<Gender, string> = {
  male: "m",
  female: "f",
  others: "t",
};

/** Flattens `clg_table3` state into Angular `table3_*` POST field names. */
function flattenTeachingFaculty(
  v: TeachingFacultyPositions,
): Record<string, string> {
  const out: Record<string, string> = {};
  TEACHING_DESIGNATIONS.forEach((d) => {
    const i = designationIndex[d.key];
    out[`table3_m${i}`] = v.sanctionedUgc[d.key];
    out[`table3_m4_${i}`] = v.sanctionedManagement[d.key];

    const ugc = v.recruitedUgc[d.key];
    const ugcTotal = sum(ugc.male, ugc.female, ugc.others);
    out[`table3_m2_${i}`] = ugc.male;
    out[`table3_f2_${i}`] = ugc.female;
    out[`table3_t2_${i}`] = ugc.others;
    out[`table3_m${i}_tot`] = ugcTotal;
    out[`table3_m3_${i}`] = yetToRecruit(v.sanctionedUgc[d.key], ugcTotal);

    const mgmt = v.recruitedManagement[d.key];
    const mgmtTotal = sum(mgmt.male, mgmt.female, mgmt.others);
    out[`table3_m5_${i}`] = mgmt.male;
    out[`table3_f5_${i}`] = mgmt.female;
    out[`table3_t5_${i}`] = mgmt.others;
    out[`table3_m5_tot${i}`] = mgmtTotal;
    out[`table3_m6_${i}`] = yetToRecruit(
      v.sanctionedManagement[d.key],
      mgmtTotal,
    );
  });
  return out;
}

/** Flattens `clg_table4`/`clg_table5` state into Angular `table4_*`/`table5_*` POST field names. */
function flattenOtherStaff(
  prefix: "table4" | "table5",
  v: OtherStaffPositions,
): Record<string, string> {
  const recruitedUgcTotal = sum(
    v.recruitedUgc.male,
    v.recruitedUgc.female,
    v.recruitedUgc.others,
  );
  const recruitedManagementTotal = sum(
    v.recruitedManagement.male,
    v.recruitedManagement.female,
    v.recruitedManagement.others,
  );
  return {
    [`${prefix}_s1_tot`]: v.sanctionedUgcTotal,
    [`${prefix}_m2`]: v.recruitedUgc.male,
    [`${prefix}_f2`]: v.recruitedUgc.female,
    [`${prefix}_t2`]: v.recruitedUgc.others,
    [`${prefix}_s2_tot`]: recruitedUgcTotal,
    [`${prefix}_s3_tot`]: yetToRecruit(v.sanctionedUgcTotal, recruitedUgcTotal),
    [`${prefix}_s4_tot`]: v.sanctionedManagementTotal,
    [`${prefix}_m5`]: v.recruitedManagement.male,
    [`${prefix}_f5`]: v.recruitedManagement.female,
    [`${prefix}_t5`]: v.recruitedManagement.others,
    [`${prefix}_s5_tot`]: recruitedManagementTotal,
    [`${prefix}_s6_tot`]: yetToRecruit(
      v.sanctionedManagementTotal,
      recruitedManagementTotal,
    ),
  };
}

/** Flattens `clg_table6`/`7`/`8` state into Angular `table6_*`/`7_*`/`8_*` POST field names. */
function flattenQualifications(
  prefix: "table6" | "table7" | "table8",
  v: QualificationMatrix,
): Record<string, string> {
  const out: Record<string, string> = {};
  QUALIFICATION_LEVELS.forEach((level) => {
    const li = qualificationLevelIndex[level.key];
    const row = v[level.key];
    const vals: string[] = [];
    TEACHING_DESIGNATIONS.forEach((d) => {
      const di = designationIndex[d.key];
      const cell = row[d.key];
      out[`${prefix}_m${di}_[${li}]`] = cell.male;
      out[`${prefix}_f${di}_[${li}]`] = cell.female;
      out[`${prefix}_t${di}_[${li}]`] = cell.others;
      vals.push(cell.male, cell.female, cell.others);
    });
    out[`${prefix}s_${li}`] = sum(...vals);
  });
  return out;
}

/** Flattens `clg_table10` state into Angular `table10_*` POST field names. */
function flattenEnrollment(v: EnrollmentMatrix): Record<string, string> {
  const out: Record<string, string> = {};
  ENROLLMENT_PROGRAMS.forEach((program) => {
    const idx = enrollmentProgramIndex[program.key];
    GENDERS.forEach((gender) => {
      const gn = genderNumber[gender];
      const row = v[program.key][gender];
      out[`table10_s${gn}_[${idx}]`] = row.state;
      out[`table10_o${gn}_[${idx}]`] = row.otherState;
      out[`table10_n${gn}_[${idx}]`] = row.nri;
      out[`table10_f${gn}_[${idx}]`] = row.foreign;
      out[`table10_t${gn}_[${idx}]`] = sum(
        row.state,
        row.otherState,
        row.nri,
        row.foreign,
      );
    });
  });
  return out;
}

/** Flattens `cat_table` state into Angular `cattabl*` POST field names. */
function flattenAdmittedYears(v: AdmittedMatrix): Record<string, string> {
  const out: Record<string, string> = {};
  ADMITTED_CATEGORIES.forEach((category) => {
    const ci = admittedCategoryIndex[category.key];
    GENDERS.forEach((gender) => {
      const letter = genderLetter[gender];
      const row = v[category.key][gender];
      ADMITTED_YEAR_KEYS.forEach((yearKey, yi) => {
        out[`cattablY${letter}${yi + 1}_[${ci}]`] = row[yearKey];
      });
    });
  });
  ADMITTED_YEAR_KEYS.forEach((yearKey, yi) => {
    const vals: string[] = [];
    ADMITTED_CATEGORIES.forEach((c) => {
      GENDERS.forEach((g) => vals.push(v[c.key][g][yearKey]));
    });
    out[`cattabl_t${yi + 1}`] = sum(...vals);
  });
  return out;
}

/**
 * Angular `staff-naac/ssr-profile` "Academic Information" tab (`#details`) —
 * posts to the external NAAC HEI Assessment Online portal (`/hei/dept1`,
 * button `ssr_clg_sav1`) via `saveSsrAcademicInfo`. Mirrors
 * `clg_table3`–`clg_table10` and `cat_table` id/name conventions exactly.
 * Pass `localOnly` for Angular `naac-assessment` demo (no portal persist).
 */
export function SsrAcademicInformationTab({
  localOnly = false,
}: {
  localOnly?: boolean;
} = {}) {
  const [programsOffered, setProgramsOffered] = useState<ProgramOfferedRow[]>(
    SSR_PROGRAMS_OFFERED_DEFAULT,
  );
  const [teachingFaculty, setTeachingFaculty] =
    useState<TeachingFacultyPositions>(SSR_TEACHING_FACULTY_POSITIONS_DEFAULT);
  const [nonTeachingStaff, setNonTeachingStaff] = useState<OtherStaffPositions>(
    SSR_OTHER_STAFF_POSITIONS_DEFAULT,
  );
  const [technicalStaff, setTechnicalStaff] = useState<OtherStaffPositions>(
    SSR_OTHER_STAFF_POSITIONS_DEFAULT,
  );
  const [permanentQualifications, setPermanentQualifications] =
    useState<QualificationMatrix>(
      SSR_PERMANENT_TEACHERS_QUALIFICATIONS_DEFAULT,
    );
  const [temporaryQualifications, setTemporaryQualifications] =
    useState<QualificationMatrix>(
      SSR_TEMPORARY_TEACHERS_QUALIFICATIONS_DEFAULT,
    );
  const [partTimeQualifications, setPartTimeQualifications] =
    useState<QualificationMatrix>(
      SSR_PART_TIME_TEACHERS_QUALIFICATIONS_DEFAULT,
    );
  const [visitingFaculty, setVisitingFaculty] = useState<VisitingFacultyForm>(
    SSR_VISITING_FACULTY_DEFAULT,
  );
  const [enrollment, setEnrollment] = useState<EnrollmentMatrix>(
    SSR_STUDENT_ENROLLMENT_MATRIX_DEFAULT,
  );
  const [admittedYears, setAdmittedYears] = useState<AdmittedMatrix>(
    SSR_STUDENTS_ADMITTED_MATRIX_DEFAULT,
  );
  const [provideDetails, setProvideDetails] = useState<ProvideDetailsForm>(
    SSR_PROVIDE_DETAILS_DEFAULT,
  );

  const visitingFacultyTotal = sum(
    visitingFaculty.male,
    visitingFaculty.female,
    visitingFaculty.others,
  );

  const handleSaveAcademic = async () => {
    const formFields: Record<string, string | number> = {
      ...flattenTeachingFaculty(teachingFaculty),
      ...flattenOtherStaff("table4", nonTeachingStaff),
      ...flattenOtherStaff("table5", technicalStaff),
      ...flattenQualifications("table6", permanentQualifications),
      ...flattenQualifications("table7", temporaryQualifications),
      ...flattenQualifications("table8", partTimeQualifications),
      ...flattenEnrollment(enrollment),
      ...flattenAdmittedYears(admittedYears),
      guest_male: visitingFaculty.male,
      guest_female: visitingFaculty.female,
      guest_oth: visitingFaculty.others,
      guest_ttl: visitingFacultyTotal,
      program_table_col4: provideDetails.selfFinancedPrograms,
      program_table_col5: provideDetails.newProgramsLastFiveYears,
      program_table3_col1: provideDetails.unitCost,
      program_table3_col2: provideDetails.unitCostIncludingSalary,
      program_table3_col3: provideDetails.unitCostExcludingSalary,
      hei_programs_count: programsOffered.length,
    };
    programsOffered.forEach((row, i) => {
      const n = i + 1;
      formFields[`prgm_${n}`] = row.level;
      formFields[`prgmnm_${n}`] = row.name;
      formFields[`prgmdur_${n}`] = row.durationMonths;
      formFields[`prgmqal_${n}`] = row.entryQualification;
      formFields[`prgmmed_sel_${n}`] = row.mediumOfInstruction.join(",");
      formFields[`prgmstr_${n}`] = row.sanctionedStrength;
      formFields[`prgmadm_${n}`] = row.studentsAdmitted;
    });
    try {
      if (localOnly) {
        toastSuccess(
          "Saved locally. This naac-assessment demo module does not persist to a backend.",
        );
        return;
      }
      await saveSsrAcademicInfo(formFields);
      toastSuccess("Academic Information saved.");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  return (
    <NaacPrimaryPanel title="Academic Information">
      <p className="animate-pulse text-center text-sm font-medium text-red-600">
        Please note the session will automatically timeout in 30 minutes, ensure
        to save the data
      </p>

      <NaacDefaultPanel title="Details of Programs Offered by the College (Give Data for Current Academic year)">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#f5f5f5] text-left text-xs font-bold">
                <th className="border border-[#ddd] px-2 py-2">
                  Level of Program
                </th>
                <th className="border border-[#ddd] px-2 py-2">
                  Name of Program/Course
                </th>
                <th className="border border-[#ddd] px-2 py-2">
                  Duration in Months
                </th>
                <th className="border border-[#ddd] px-2 py-2">
                  Entry Qualification
                </th>
                <th className="border border-[#ddd] px-2 py-2">
                  Medium of Instruction
                </th>
                <th className="border border-[#ddd] px-2 py-2">
                  Sanctioned Strength
                </th>
                <th className="border border-[#ddd] px-2 py-2">
                  No.of Students Admitted
                </th>
              </tr>
            </thead>
            <tbody>
              {programsOffered.map((row, i) => (
                <tr key={row.level}>
                  <td className="border border-[#ddd] px-2 py-2 align-top">
                    <Input
                      className="h-9 bg-[#eef2f7]"
                      readOnly
                      value={row.level}
                    />
                  </td>
                  <td className="border border-[#ddd] px-2 py-2 align-top">
                    <Input
                      className="h-9 bg-[#eef2f7]"
                      readOnly
                      title={row.name}
                      value={row.name}
                    />
                  </td>
                  <td className="border border-[#ddd] px-2 py-2 align-top">
                    <Input
                      className="h-9"
                      maxLength={3}
                      value={row.durationMonths}
                      onChange={(e) =>
                        setProgramsOffered((prev) =>
                          prev.map((r, idx) =>
                            idx === i
                              ? { ...r, durationMonths: e.target.value }
                              : r,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="border border-[#ddd] px-2 py-2 align-top">
                    <Input
                      className="h-9"
                      maxLength={200}
                      value={row.entryQualification}
                      onChange={(e) =>
                        setProgramsOffered((prev) =>
                          prev.map((r, idx) =>
                            idx === i
                              ? { ...r, entryQualification: e.target.value }
                              : r,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="border border-[#ddd] px-2 py-2 align-top">
                    <select
                      multiple
                      size={6}
                      className={`${nativeSelectClass} min-h-[120px]`}
                      value={row.mediumOfInstruction}
                      onChange={(e) => {
                        const selected = Array.from(
                          e.target.selectedOptions,
                        ).map((o) => o.value);
                        setProgramsOffered((prev) =>
                          prev.map((r, idx) =>
                            idx === i
                              ? { ...r, mediumOfInstruction: selected }
                              : r,
                          ),
                        );
                      }}
                    >
                      {SSR_MEDIUM_OF_INSTRUCTION.map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="border border-[#ddd] px-2 py-2 align-top">
                    <Input
                      className="h-9"
                      maxLength={5}
                      value={row.sanctionedStrength}
                      onChange={(e) =>
                        setProgramsOffered((prev) =>
                          prev.map((r, idx) =>
                            idx === i
                              ? { ...r, sanctionedStrength: e.target.value }
                              : r,
                          ),
                        )
                      }
                    />
                  </td>
                  <td className="border border-[#ddd] px-2 py-2 align-top">
                    <Input
                      className="h-9"
                      maxLength={5}
                      value={row.studentsAdmitted}
                      onChange={(e) =>
                        setProgramsOffered((prev) =>
                          prev.map((r, idx) =>
                            idx === i
                              ? { ...r, studentsAdmitted: e.target.value }
                              : r,
                          ),
                        )
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </NaacDefaultPanel>

      <NaacDefaultPanel title="Position Details of Faculty & Staff in the College">
        <div className="space-y-6">
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#333]">
              Teaching Faculty
            </label>
            <TeachingFacultyPositionsTable
              value={teachingFaculty}
              onChange={setTeachingFaculty}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#333]">
              Non-Teaching Staff
            </label>
            <OtherStaffPositionsTable
              value={nonTeachingStaff}
              onChange={setNonTeachingStaff}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-semibold text-[#333]">
              Technical Staff
            </label>
            <OtherStaffPositionsTable
              value={technicalStaff}
              onChange={setTechnicalStaff}
            />
          </div>
        </div>
      </NaacDefaultPanel>

      <NaacDefaultPanel title="Qualification Details of the Teaching Staff">
        <div className="space-y-6">
          <QualificationTable
            title="Permanent Teachers"
            value={permanentQualifications}
            onChange={setPermanentQualifications}
          />
          <QualificationTable
            title="Temporary Teachers"
            value={temporaryQualifications}
            onChange={setTemporaryQualifications}
          />
          <QualificationTable
            title="Part Time Teachers"
            value={partTimeQualifications}
            onChange={setPartTimeQualifications}
          />
        </div>
      </NaacDefaultPanel>

      <NaacDefaultPanel title="Details of Visiting/Guest Faculties">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse border border-black text-center text-xs">
            <thead>
              <tr>
                <MatrixTh />
                <MatrixTh>Male</MatrixTh>
                <MatrixTh>Female</MatrixTh>
                <MatrixTh>Others</MatrixTh>
                <MatrixTh>Total</MatrixTh>
              </tr>
            </thead>
            <tbody>
              <tr>
                <MatrixTd className="text-left font-medium">
                  Number of Visiting/Guest Faculty engaged with the college?
                </MatrixTd>
                <MatrixTd>
                  <Input
                    className={matrixInputClass}
                    maxLength={3}
                    inputMode="numeric"
                    value={visitingFaculty.male}
                    onChange={(e) =>
                      setVisitingFaculty((v) => ({
                        ...v,
                        male: e.target.value,
                      }))
                    }
                  />
                </MatrixTd>
                <MatrixTd>
                  <Input
                    className={matrixInputClass}
                    maxLength={3}
                    inputMode="numeric"
                    value={visitingFaculty.female}
                    onChange={(e) =>
                      setVisitingFaculty((v) => ({
                        ...v,
                        female: e.target.value,
                      }))
                    }
                  />
                </MatrixTd>
                <MatrixTd>
                  <Input
                    className={matrixInputClass}
                    maxLength={3}
                    inputMode="numeric"
                    value={visitingFaculty.others}
                    onChange={(e) =>
                      setVisitingFaculty((v) => ({
                        ...v,
                        others: e.target.value,
                      }))
                    }
                  />
                </MatrixTd>
                <MatrixTd>
                  <Input
                    className={matrixReadonlyClass}
                    readOnly
                    value={visitingFacultyTotal}
                  />
                </MatrixTd>
              </tr>
            </tbody>
          </table>
        </div>
      </NaacDefaultPanel>

      <NaacDefaultPanel title="Provide the Following Details of Students Enrolled in the College During the Current Academic Year">
        <StudentEnrollmentTable value={enrollment} onChange={setEnrollment} />
      </NaacDefaultPanel>

      <NaacDefaultPanel title="Provide the Following Details of Students admitted to the College During the last four Academic Years">
        <AdmittedYearsTable value={admittedYears} onChange={setAdmittedYears} />
      </NaacDefaultPanel>

      <NaacDefaultPanel title="Provide the Following Details">
        <NaacBorderedTable fixed={false}>
          <thead>
            <tr>
              <NaacTh>Number of Programs</NaacTh>
              <NaacTh>Self-financed Programs offered</NaacTh>
              <NaacTh>
                New Programs introduced during the last five years
              </NaacTh>
            </tr>
          </thead>
          <tbody>
            <tr>
              <NaacTd />
              <NaacTd>
                <Input
                  className="h-9"
                  maxLength={7}
                  inputMode="numeric"
                  value={provideDetails.selfFinancedPrograms}
                  onChange={(e) =>
                    setProvideDetails((p) => ({
                      ...p,
                      selfFinancedPrograms: e.target.value,
                    }))
                  }
                />
              </NaacTd>
              <NaacTd>
                <Input
                  className="h-9"
                  maxLength={7}
                  inputMode="numeric"
                  value={provideDetails.newProgramsLastFiveYears}
                  onChange={(e) =>
                    setProvideDetails((p) => ({
                      ...p,
                      newProgramsLastFiveYears: e.target.value,
                    }))
                  }
                />
              </NaacTd>
            </tr>
          </tbody>
        </NaacBorderedTable>

        <NaacBorderedTable fixed={false} className="mt-3">
          <thead>
            <tr>
              <NaacTh>Unit Cost of Education</NaacTh>
              <NaacTh>Including Salary Component</NaacTh>
              <NaacTh>Excluding Salary Component</NaacTh>
            </tr>
          </thead>
          <tbody>
            <tr>
              <NaacTd>
                <Input
                  className="h-9"
                  maxLength={10}
                  value={provideDetails.unitCost}
                  onChange={(e) =>
                    setProvideDetails((p) => ({
                      ...p,
                      unitCost: e.target.value,
                    }))
                  }
                />
              </NaacTd>
              <NaacTd>
                <Input
                  className="h-9"
                  maxLength={10}
                  value={provideDetails.unitCostIncludingSalary}
                  onChange={(e) =>
                    setProvideDetails((p) => ({
                      ...p,
                      unitCostIncludingSalary: e.target.value,
                    }))
                  }
                />
              </NaacTd>
              <NaacTd>
                <Input
                  className="h-9"
                  maxLength={10}
                  value={provideDetails.unitCostExcludingSalary}
                  onChange={(e) =>
                    setProvideDetails((p) => ({
                      ...p,
                      unitCostExcludingSalary: e.target.value,
                    }))
                  }
                />
              </NaacTd>
            </tr>
          </tbody>
        </NaacBorderedTable>
        <p className="mt-2 text-xs italic text-muted-foreground">
          Formula: (Unit cost = total annual recurring expenditure (actual)
          divided by total number of students enrolled)
        </p>
      </NaacDefaultPanel>

      <div className="flex justify-center gap-3">
        <Button
          type="button"
          className="w-[150px] bg-[#f0ad4e] text-white hover:bg-[#ec971f]"
          onClick={handleSaveAcademic}
        >
          Save
        </Button>
        <Button
          type="button"
          className="w-[150px]"
          onClick={handleSaveAcademic}
        >
          Submit and Next
        </Button>
      </div>
    </NaacPrimaryPanel>
  );
}
