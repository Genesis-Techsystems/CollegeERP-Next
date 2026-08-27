"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageContainer } from "@/components/layout";
import { RichTextEditor } from "@/common/components/rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select } from "@/common/components/select";
import { toastSuccess } from "@/lib/toast";
import {
  CopyTextButton,
  NaacNativeFileInput,
} from "../../staff-naac/_components/NaacSection";
import { SsrAcademicInformationTab } from "../../staff-naac/ssr-profile/_components/SsrAcademicInformationTab";
import {
  SSR_COLLEGE_ADDRESS,
  SSR_CONTACTS,
  SSR_ESTABLISHMENT,
  SSR_LITERACY_ITEMS,
  SSR_LOCATION,
  SSR_NEP_ITEMS,
  SSR_STATUTORY_APPROVAL_DEFAULTS,
  SSR_UGC_RECOGNITION,
  type StatutoryApprovalRow,
} from "../../staff-naac/_data/ssr-profile-data";
import {
  NaacMatAccordion,
  NaacMatTable,
  NaacMatTd,
  NaacYellowTh,
  naacMatTabListClass,
  naacMatTabTriggerClass,
} from "./_components/NaacMatAccordion";

const GENDER_OPTIONS = [
  { value: "0", label: "Select" },
  { value: "1", label: "For Men" },
  { value: "2", label: "For Women" },
  { value: "3", label: "Co-education" },
];

const YES_NO = [
  { value: "1", label: "No" },
  { value: "2", label: "Yes" },
];

const LOCATION_OPTIONS = [
  { value: "1", label: "Urban" },
  { value: "2", label: "Semi-urban" },
  { value: "3", label: "Rural" },
  { value: "4", label: "Tribal" },
  { value: "5", label: "Hill" },
];

const UNIVERSITY_DOC =
  "https://assessmentonline.naac.gov.in/public/index.php/admin/get_file?file_path=eyJpdiI6ImptWDVnUWFmdVhrdUF6UzNBTWdtM1E9PSIsInZhbHVlIjoiRkU3eGtXV3lsWjZWbnRkclo4bk81RDFKdTZMbEdNdnloSHhIckk1ZlZPUjJvMWVUTG1reXFXY3lJbTY1Vjc2eWpOUVVjT2R2ZWxCSXdadXF2YU1xUUpFTHBvZmtNR2FXdllzQ0pzU005YW1MK2NDcUkxV0loejc2RVo5VVNLYk0iLCJtYWMiOiIwZjIxNzYyNTcxZDRiODY5NTc0N2JkZWZiM2RjYmNlMDFmY2ZiMjIzZDY0OWM3NDMxZmJhNTYwNjUwMzE3NWY4IiwidGFnIjoiIn0=";

/**
 * Angular `naac-assessment/ssr-profile-page` — Material tabs + expansion panels
 * demo (yellow active tab, accordion Basic Information). Local toast only.
 */
export default function NaacAssessmentSsrProfilePage() {
  const router = useRouter();
  const [tab, setTab] = useState("basic");
  const [byGender, setByGender] = useState("0");
  const [shiftRegular, setShiftRegular] = useState(false);
  const [shiftDay, setShiftDay] = useState(false);
  const [shiftEvening, setShiftEvening] = useState(false);
  const [minority, setMinority] = useState("1");
  const [religious, setReligious] = useState("");
  const [linguistic, setLinguistic] = useState("");
  const [minorityOther, setMinorityOther] = useState("");
  const [autonomyConferment, setAutonomyConferment] = useState("1");
  const [autonomousApplied, setAutonomousApplied] = useState("0");
  const [agencyRecognized, setAgencyRecognized] = useState("1");
  const [agencyName, setAgencyName] = useState("");
  const [agencyDate, setAgencyDate] = useState("");
  const [locationType, setLocationType] = useState("");
  const [campusArea, setCampusArea] = useState(
    SSR_LOCATION[0]?.CampusAreainAcres ?? "",
  );
  const [builtUp, setBuiltUp] = useState(
    SSR_LOCATION[0]?.BuiltupAreainsqmts ?? "",
  );
  const [statutory, setStatutory] = useState<StatutoryApprovalRow[]>(
    SSR_STATUTORY_APPROVAL_DEFAULTS,
  );
  const [nepText, setNepText] = useState<Record<string, string>>(
    Object.fromEntries(SSR_NEP_ITEMS.map((n) => [n.id, n.defaultText])),
  );
  const [literacyText, setLiteracyText] = useState<Record<string, string>>(
    Object.fromEntries(SSR_LITERACY_ITEMS.map((l) => [l.id, ""])),
  );

  const minorityYes = minority === "2";
  const autonomyYes = autonomyConferment === "2";
  const agencyYes = agencyRecognized === "2";

  const saveLocal = () =>
    toastSuccess(
      "Saved locally. This naac-assessment demo module does not persist to a backend.",
    );

  const saveAndNext = () => {
    saveLocal();
    setTab("academic");
  };

  const updateStatutory = (
    index: number,
    patch: Partial<StatutoryApprovalRow>,
  ) =>
    setStatutory((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    );

  return (
    <>
      <PageContainer className="pt-5">
        <div className="overflow-hidden rounded border border-[#ddd] bg-[#f5f5f5]">
          <Tabs value={tab} onValueChange={setTab}>
            <div className="overflow-x-auto border-b border-[#ddd] bg-white">
              <TabsList className={naacMatTabListClass}>
                <TabsTrigger value="basic" className={naacMatTabTriggerClass}>
                  Basic Information
                </TabsTrigger>
                <TabsTrigger
                  value="academic"
                  className={naacMatTabTriggerClass}
                >
                  Academic Information
                </TabsTrigger>
                <TabsTrigger
                  value="evaluative"
                  className={naacMatTabTriggerClass}
                >
                  Evaluative Report of the Departments
                </TabsTrigger>
                <TabsTrigger value="nep" className={naacMatTabTriggerClass}>
                Institutional preparedness for NEP
              </TabsTrigger>
                <TabsTrigger
                  value="literacy"
                  className={naacMatTabTriggerClass}
                >
                  Institutional Initiatives for Electoral Literacy
              </TabsTrigger>
            </TabsList>
          </div>

            {/* ── Basic Information ── */}
            <TabsContent value="basic" className="m-0 space-y-0 p-4">
              <NaacMatAccordion title="Name and Address of the College">
                <NaacMatTable>
                  <tbody>
                    <tr>
                      <NaacYellowTh>Name</NaacYellowTh>
                      <NaacYellowTh>Adress</NaacYellowTh>
                      <NaacYellowTh>City</NaacYellowTh>
                      <NaacYellowTh>Pin</NaacYellowTh>
                      <NaacYellowTh>State</NaacYellowTh>
                      <NaacYellowTh>Website</NaacYellowTh>
                    </tr>
                    <tr>
                      <NaacMatTd>{SSR_COLLEGE_ADDRESS.Name}</NaacMatTd>
                      <NaacMatTd>{SSR_COLLEGE_ADDRESS.Address}</NaacMatTd>
                      <NaacMatTd>{SSR_COLLEGE_ADDRESS.City}</NaacMatTd>
                      <NaacMatTd>{SSR_COLLEGE_ADDRESS.Pin}</NaacMatTd>
                      <NaacMatTd>{SSR_COLLEGE_ADDRESS.State}</NaacMatTd>
                      <NaacMatTd>{SSR_COLLEGE_ADDRESS.Website}</NaacMatTd>
                    </tr>
                  </tbody>
                </NaacMatTable>
              </NaacMatAccordion>

              <NaacMatAccordion title="Contacts for Communication">
                <NaacMatTable>
                  <tbody>
                    <tr>
                      <NaacYellowTh>Designation</NaacYellowTh>
                      <NaacYellowTh>Name</NaacYellowTh>
                      <NaacYellowTh>Telephone with STD Code</NaacYellowTh>
                      <NaacYellowTh>Mobile</NaacYellowTh>
                      <NaacYellowTh>Fax</NaacYellowTh>
                      <NaacYellowTh>Email</NaacYellowTh>
                    </tr>
                    {SSR_CONTACTS.map((c) => (
                      <tr key={c.Email}>
                        <NaacMatTd>{c.Designation}</NaacMatTd>
                        <NaacMatTd>{c.Name}</NaacMatTd>
                        <NaacMatTd>{c.TelephonewithSTDCode}</NaacMatTd>
                        <NaacMatTd>{c.Mobile}</NaacMatTd>
                        <NaacMatTd>{c.Fax}</NaacMatTd>
                        <NaacMatTd>{c.Email}</NaacMatTd>
                      </tr>
                    ))}
                  </tbody>
                </NaacMatTable>
              </NaacMatAccordion>

              <NaacMatAccordion title="Status of the Institution">
                <NaacMatTable className="table-fixed">
                  <tbody>
                    <tr>
                      <NaacMatTd className="w-1/2">
                        Institution Status
                      </NaacMatTd>
                      <NaacMatTd value />
                    </tr>
                    <tr>
                      <NaacMatTd />
                      <NaacMatTd value>Private</NaacMatTd>
                    </tr>
                    <tr>
                      <NaacMatTd />
                      <NaacMatTd value>Self Financing</NaacMatTd>
                    </tr>
                  </tbody>
                </NaacMatTable>
              </NaacMatAccordion>

              <NaacMatAccordion title="Type of Institution">
                <NaacMatTable className="mx-auto w-full max-w-xl table-fixed">
                  <tbody>
                    <tr>
                      <NaacMatTd className="w-1/2">By Gender</NaacMatTd>
                      <NaacMatTd value>
                        <Select
                          value={byGender}
                          onChange={(v) => setByGender(v ?? "0")}
                          options={GENDER_OPTIONS}
                          searchable={false}
                        />
                      </NaacMatTd>
                    </tr>
                    <tr>
                      <NaacMatTd>By Shift</NaacMatTd>
                      <NaacMatTd>
                        <div className="flex flex-wrap items-center gap-4 text-sm text-[#5b2c6f]">
                          <label className="inline-flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={shiftRegular}
                              onChange={(e) =>
                                setShiftRegular(e.target.checked)
                              }
                            />
                            Regular
                          </label>
                          <label className="inline-flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={shiftDay}
                              onChange={(e) => setShiftDay(e.target.checked)}
                            />
                            Day
                          </label>
                          <label className="inline-flex items-center gap-1.5">
                            <input
                              type="checkbox"
                              checked={shiftEvening}
                              onChange={(e) =>
                                setShiftEvening(e.target.checked)
                              }
                            />
                            Evening
                          </label>
                        </div>
                      </NaacMatTd>
                    </tr>
                  </tbody>
                </NaacMatTable>
              </NaacMatAccordion>

              <NaacMatAccordion title="Recognized Minority Institution">
                <NaacMatTable className="table-fixed">
                  <tbody>
                    <tr>
                      <NaacMatTd className="w-[40%]">
                        If it is a recognized minority institution
                      </NaacMatTd>
                      <NaacMatTd>
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="w-40">
                            <Select
                              value={minority}
                              onChange={(v) => setMinority(v ?? "1")}
                              options={YES_NO}
                              searchable={false}
                            />
                            <div className="mt-2">
                              <NaacNativeFileInput
                                id="minority_upload"
                                name="minority_upload"
                              />
                            </div>
                          </div>
                          <CopyTextButton
                            text={minority === "2" ? "Yes" : "No"}
                          />
                        </div>
                      </NaacMatTd>
                    </tr>
                    <tr>
                      <NaacMatTd>If yes, specify minority status</NaacMatTd>
                      <NaacMatTd />
                    </tr>
                    <tr>
                      <NaacMatTd>Religious</NaacMatTd>
                      <NaacMatTd>
                        <Input
                          className="h-9"
                          value={religious}
                          disabled={!minorityYes}
                          onChange={(e) => setReligious(e.target.value)}
                        />
                      </NaacMatTd>
                    </tr>
                    <tr>
                      <NaacMatTd>Linguistic</NaacMatTd>
                      <NaacMatTd>
                        <Input
                          className="h-9"
                          value={linguistic}
                          disabled={!minorityYes}
                          onChange={(e) => setLinguistic(e.target.value)}
                        />
                      </NaacMatTd>
                    </tr>
                    <tr>
                      <NaacMatTd>Any Other</NaacMatTd>
                      <NaacMatTd>
                        <Input
                          className="h-9"
                          value={minorityOther}
                          disabled={!minorityYes}
                          onChange={(e) => setMinorityOther(e.target.value)}
                        />
                      </NaacMatTd>
                    </tr>
                  </tbody>
                </NaacMatTable>
              </NaacMatAccordion>

              <NaacMatAccordion title="Establishment Details">
                <NaacMatTable className="table-fixed">
                  <tbody>
                    <tr>
                      <NaacMatTd className="w-1/2">
                        Date of establishment of the college
                      </NaacMatTd>
                      <NaacMatTd value>{SSR_ESTABLISHMENT.date}</NaacMatTd>
                    </tr>
                    <tr>
                      <NaacMatTd>
                        Number of academic year completed till date
                      </NaacMatTd>
                      <NaacMatTd value>
                        {SSR_ESTABLISHMENT.yearsCompleted}
                      </NaacMatTd>
                    </tr>
                  </tbody>
                </NaacMatTable>

                <p className="mb-2 mt-4 text-center text-sm font-bold">
                  University to which the college is affiliated/ or which
                  governs the college (if it is a constituent college)
                </p>
                <NaacMatTable>
                  <tbody>
                    <tr>
                      <NaacYellowTh>State</NaacYellowTh>
                      <NaacYellowTh>University name</NaacYellowTh>
                      <NaacYellowTh>View Document</NaacYellowTh>
                    </tr>
                    <tr>
                      <NaacMatTd>{SSR_ESTABLISHMENT.universityState}</NaacMatTd>
                      <NaacMatTd>{SSR_ESTABLISHMENT.universityName}</NaacMatTd>
                      <NaacMatTd>
                        <a
                          href={UNIVERSITY_DOC}
                          target="_blank"
                          rel="noreferrer"
                          className="text-black underline"
                        >
                          View Document
                        </a>
                      </NaacMatTd>
                    </tr>
                  </tbody>
                </NaacMatTable>

                <p className="mb-2 mt-4 text-center text-sm font-bold">
                  Details of UGC Recognition
                </p>
                <NaacMatTable>
                  <tbody>
                    <tr>
                      <NaacYellowTh>Under Section</NaacYellowTh>
                      <NaacYellowTh>Date</NaacYellowTh>
                      <NaacYellowTh>View Document</NaacYellowTh>
                    </tr>
                    {SSR_UGC_RECOGNITION.map((row) => (
                      <tr key={row.section}>
                        <NaacMatTd>{row.section}</NaacMatTd>
                        <NaacMatTd>{row.date}</NaacMatTd>
                        <NaacMatTd>{row.document}</NaacMatTd>
                      </tr>
                    ))}
                  </tbody>
                </NaacMatTable>

                <p className="mb-2 mt-4 text-center text-sm font-bold">
                  Details of Recognition/Approval by Statutory/Regulatory bodies
                  like AICTE,NCTE,MCI,DCI,PCI,RCI etc(other than UGC)
                </p>
                <NaacMatTable>
                  <tbody>
                    <tr>
                      <NaacYellowTh>
                        Statutory Regulatory Authority
                      </NaacYellowTh>
                      <NaacYellowTh>
                        Recognition/Approval details Institution/Department
                        Program
                      </NaacYellowTh>
                      <NaacYellowTh>
                        Day,Month and Year(dd/mm/yyyy)
                      </NaacYellowTh>
                      <NaacYellowTh>Validity in months</NaacYellowTh>
                      <NaacYellowTh>Remarks</NaacYellowTh>
                    </tr>
                    {statutory.map((row, i) => (
                      <tr key={row.authority}>
                        <NaacMatTd value>{row.authority}</NaacMatTd>
                        <NaacMatTd>
                          {row.documentUrl ? (
                            <a
                              href={row.documentUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="underline"
                            >
                              View Document
                            </a>
                          ) : null}
                        </NaacMatTd>
                        <NaacMatTd value>
                          <Input
                            className="h-9"
                            value={row.date}
                            onChange={(e) =>
                              updateStatutory(i, { date: e.target.value })
                            }
                          />
                        </NaacMatTd>
                        <NaacMatTd value>
                          <Input
                            className="h-9"
                            value={row.validityMonths}
                            onChange={(e) =>
                              updateStatutory(i, {
                                validityMonths: e.target.value,
                              })
                            }
                          />
                        </NaacMatTd>
                        <NaacMatTd value>
                <Textarea
                            rows={2}
                            value={row.remarks}
                            onChange={(e) =>
                              updateStatutory(i, { remarks: e.target.value })
                            }
                          />
                        </NaacMatTd>
                      </tr>
                    ))}
                  </tbody>
                </NaacMatTable>
              </NaacMatAccordion>

              <NaacMatAccordion title="Details of Autonomy">
                <NaacMatTable className="table-fixed">
                  <tbody>
                    <tr>
                      <NaacMatTd className="w-[55%]">
                        Does the affiliating university Act provide for
                        conferment of autonomy (as recognized by the UGC), on
                        its affiliated colleges?
                      </NaacMatTd>
                      <NaacMatTd>
                        <div className="flex flex-wrap items-start gap-3">
                          <div className="w-40">
                            <Select
                              value={autonomyConferment}
                              onChange={(v) => setAutonomyConferment(v ?? "1")}
                              options={YES_NO}
                              searchable={false}
                            />
                            <div className="mt-2">
                              <NaacNativeFileInput
                                id="autonomy_upload"
                                name="autonomy_upload"
                              />
                            </div>
                          </div>
                          <CopyTextButton text={autonomyYes ? "Yes" : "No"} />
                        </div>
                      </NaacMatTd>
                    </tr>
                    <tr>
                      <NaacMatTd>
                        If yes, has the College applied for availing the
                        autonomous status?
                      </NaacMatTd>
                      <NaacMatTd>
                        <div className="w-48">
                          <Select
                            value={autonomousApplied}
                            onChange={(v) => setAutonomousApplied(v ?? "0")}
                            options={[
                              { value: "0", label: "Select" },
                              ...YES_NO,
                            ]}
                            searchable={false}
                            disabled={!autonomyYes}
                          />
                        </div>
                      </NaacMatTd>
                    </tr>
                  </tbody>
                </NaacMatTable>
              </NaacMatAccordion>

              <NaacMatAccordion title="Recognitions">
                <NaacMatTable className="mb-3 table-fixed">
                  <tbody>
                    <tr>
                      <NaacMatTd className="w-1/2">
                        Is the College recognized by UGC as a College with
                        Potential for Excellence(CPE)?
                      </NaacMatTd>
                      <NaacMatTd value>No</NaacMatTd>
                    </tr>
                  </tbody>
                </NaacMatTable>
                <NaacMatTable className="table-fixed">
                  <tbody>
                    <tr>
                      <NaacMatTd className="w-1/2">
                        Is the College recognized for its performance by any
                        other governmental agency?
                      </NaacMatTd>
                      <NaacMatTd>
                        <div className="w-40">
                          <Select
                            value={agencyRecognized}
                            onChange={(v) => setAgencyRecognized(v ?? "1")}
                            options={YES_NO}
                            searchable={false}
                          />
                        </div>
                      </NaacMatTd>
                    </tr>
                    <tr>
                      <NaacMatTd>If yes, name of the agency</NaacMatTd>
                      <NaacMatTd>
                        <Input
                          className="h-9"
                          value={agencyName}
                          disabled={!agencyYes}
                          onChange={(e) => setAgencyName(e.target.value)}
                        />
                      </NaacMatTd>
                    </tr>
                    <tr>
                      <NaacMatTd>Date of recognition</NaacMatTd>
                      <NaacMatTd>
                        <Input
                          className="h-9"
                          value={agencyDate}
                          disabled={!agencyYes}
                          onChange={(e) => setAgencyDate(e.target.value)}
                        />
                      </NaacMatTd>
                    </tr>
                  </tbody>
                </NaacMatTable>
              </NaacMatAccordion>

              <NaacMatAccordion title="Location and Area of the Campus">
                <NaacMatTable>
                  <tbody>
                    <tr>
                      <NaacYellowTh>Campus Type</NaacYellowTh>
                      <NaacYellowTh>Address</NaacYellowTh>
                      <NaacYellowTh>Location *</NaacYellowTh>
                      <NaacYellowTh>Campus Area in Acres</NaacYellowTh>
                      <NaacYellowTh>Built up Area in sq.mts.</NaacYellowTh>
                    </tr>
                    <tr>
                      <NaacMatTd>{SSR_LOCATION[0]?.CampusType}</NaacMatTd>
                      <NaacMatTd>{SSR_LOCATION[0]?.Address}</NaacMatTd>
                      <NaacMatTd>
                        <Select
                          value={locationType || null}
                          onChange={(v) => setLocationType(v ?? "")}
                          options={LOCATION_OPTIONS}
                          placeholder="--Select--"
                          searchable={false}
                        />
                      </NaacMatTd>
                      <NaacMatTd>
                        <Input
                          className="h-9"
                          maxLength={8}
                          value={campusArea}
                          onChange={(e) => setCampusArea(e.target.value)}
                        />
                      </NaacMatTd>
                      <NaacMatTd>
                        <Input
                          className="h-9"
                          maxLength={8}
                          value={builtUp}
                          onChange={(e) => setBuiltUp(e.target.value)}
                        />
                      </NaacMatTd>
                    </tr>
                  </tbody>
                </NaacMatTable>
              </NaacMatAccordion>

              <div className="flex justify-end pt-2">
                <Button type="button" onClick={saveAndNext}>
                  Save and Next
                </Button>
              </div>
            </TabsContent>

            {/* ── Academic Information ── */}
            <TabsContent value="academic" className="m-0 bg-white p-4">
              <SsrAcademicInformationTab localOnly />
            </TabsContent>

            {/* ── Evaluative ── */}
            <TabsContent value="evaluative" className="m-0 p-4">
              <div className="mt-3 rounded border border-[#f5c6cb] bg-[rgb(227,98,98)]/10 p-4">
                <div className="rounded border border-[#faebcc] bg-[#fcf8e3] px-4 py-3 text-center text-[#8a6d3b]">
                  <strong>Info!</strong> Not Applicable for Affiliated Colleges.
                </div>
              </div>
            </TabsContent>

            {/* ── NEP ── */}
            <TabsContent value="nep" className="m-0 space-y-0 p-4">
              {SSR_NEP_ITEMS.map((item) => (
                <NaacMatAccordion
                  key={item.id}
                  title={item.label.replace(/^\d+\.\s*/, "").replace(/:$/, "")}
                >
                  <RichTextEditor
                    value={nepText[item.id] ?? ""}
                    onChange={(html) =>
                      setNepText((prev) => ({ ...prev, [item.id]: html }))
                    }
                    toolbarVariant="quill"
                    minHeight={160}
                  />
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
                    <span className="text-[15px] font-normal text-[#FFA500]">
                      *Atleast 1 characters and within 500 words
                    </span>
                    <CopyTextButton text={nepText[item.id] ?? ""} />
                  </div>
                </NaacMatAccordion>
              ))}
              <div className="flex justify-end pt-2">
                <Button type="button" onClick={saveLocal}>
                  Save
                </Button>
              </div>
          </TabsContent>

            {/* ── Electoral Literacy ── */}
            <TabsContent value="literacy" className="m-0 space-y-4 p-4">
            {SSR_LITERACY_ITEMS.map((item) => (
                <div key={item.id} className="rounded bg-white p-4 shadow-sm">
                  <p className="mb-2 text-sm font-medium text-[#1565c0]">
                    {item.label}
                  </p>
                  <RichTextEditor
                  value={literacyText[item.id] ?? ""}
                    onChange={(html) =>
                      setLiteracyText((prev) => ({
                        ...prev,
                        [item.id]: html,
                      }))
                    }
                    toolbarVariant="quill"
                    minHeight={140}
                  />
                  <div className="mt-2 flex justify-end">
                  <CopyTextButton text={literacyText[item.id] ?? ""} />
                </div>
              </div>
            ))}
              <div className="flex justify-end">
                <Button type="button" onClick={saveLocal}>
                  Save
                </Button>
              </div>
          </TabsContent>
        </Tabs>
        </div>
        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            onClick={() =>
              router.push("/naac-assessment/ssr_extended_profile?tab=qif")
            }
          >
            Proceed to QIF
          </Button>
        </div>
      </PageContainer>
    </>
  );
}
