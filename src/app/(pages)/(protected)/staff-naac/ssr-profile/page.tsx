"use client";

import { useState } from "react";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { getErrorMessage } from "@/lib/errors";
import {
  saveSsrBasicInfoColg,
  saveSsrLiteracyFields,
  saveSsrNepFields,
  uploadSsrProfileFile,
} from "@/services";
import {
  NaacBorderedTable,
  NaacDefaultPanel,
  NaacLabelValueRow,
  NaacPrimaryPanel,
  NaacSimpleTable,
  NaacTd,
  NaacTh,
  naacTabListClass,
  naacTabTriggerClass,
} from "../_components/NaacSection";
import { SsrAcademicInformationTab } from "./_components/SsrAcademicInformationTab";
import {
  SSR_COLLEGE_ADDRESS,
  SSR_CONTACTS,
  SSR_ESTABLISHMENT,
  SSR_INSTITUTION_STATUS_DEFAULTS,
  SSR_LITERACY_ITEMS,
  SSR_LOCATION,
  SSR_LOCATION_FORM_DEFAULTS,
  SSR_NEP_ITEMS,
  SSR_STATUTORY_APPROVAL_DEFAULTS,
  SSR_UGC_RECOGNITION,
  type StatutoryApprovalRow,
} from "../_data/ssr-profile-data";

type TabId = "basic" | "academic" | "evaluative" | "nep" | "literacy";

const TABS: Array<{ id: TabId; label: string }> = [
  { id: "basic", label: "Basic Information" },
  { id: "academic", label: "Academic Information" },
  { id: "evaluative", label: "Evaluative Report of the Departments" },
  { id: "nep", label: "Institutional preparedness for NEP" },
  { id: "literacy", label: "Institutional Initiatives for Electoral Literacy" },
];

const nativeSelectClass =
  "w-full rounded border border-[#ccc] px-2 py-1.5 text-sm";

/** Angular `staff-naac/ssr-profile` — posts to the external NAAC HEI
 * Assessment Online portal (`/hei/dept1`) via `src/services/naac-portal.ts`,
 * mirroring the old jQuery `$.ajax` calls (`ssrprof_nepsave`,
 * `ssrprof_literacysave`, `basic_info_colg_save`, academic tab `ssr_clg_sav1`). */
export default function SsrProfilePage() {
  const [status, setStatus] = useState(SSR_INSTITUTION_STATUS_DEFAULTS);
  const [location, setLocation] = useState(SSR_LOCATION_FORM_DEFAULTS);
  const [yearsCompleted, setYearsCompleted] = useState(
    SSR_ESTABLISHMENT.yearsCompleted,
  );
  const [statutoryRows, setStatutoryRows] = useState<StatutoryApprovalRow[]>(
    SSR_STATUTORY_APPROVAL_DEFAULTS,
  );
  const [minorityFile, setMinorityFile] = useState<File | null>(null);
  const [autonomyFile, setAutonomyFile] = useState<File | null>(null);

  const [nepText, setNepText] = useState<Record<string, string>>(
    Object.fromEntries(SSR_NEP_ITEMS.map((n) => [n.id, n.defaultText])),
  );
  const [literacyText, setLiteracyText] = useState<Record<string, string>>(
    Object.fromEntries(SSR_LITERACY_ITEMS.map((l) => [l.id, ""])),
  );

  /** Angular `check_filled` — all textareas in the group must be non-empty before Save. */
  const checkFilled = (fields: Record<string, string>): boolean =>
    Object.values(fields).every((v) => v.trim().length > 0);

  const handleSaveNep = async () => {
    if (!checkFilled(nepText)) {
      toastInfo("Please fill all fields before saving.");
      return;
    }
    try {
      await saveSsrNepFields({
        nep_multi: nepText.nep_multi ?? "",
        nep_abc: nepText.nep_abc ?? "",
        nep_skill: nepText.nep_skill ?? "",
        nep_iks: nepText.nep_iks ?? "",
        nep_obe: nepText.nep_obe ?? "",
        nep_distant: nepText.nep_distant ?? "",
      });
      toastSuccess("NEP preparedness saved.");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleSaveLiteracy = async () => {
    if (!checkFilled(literacyText)) {
      toastInfo("Please fill all fields before saving.");
      return;
    }
    try {
      await saveSsrLiteracyFields({
        literacy1: literacyText.literacy1 ?? "",
        literacy2: literacyText.literacy2 ?? "",
        literacy3: literacyText.literacy3 ?? "",
        literacy4: literacyText.literacy4 ?? "",
        literacy5: literacyText.literacy5 ?? "",
      });
      toastSuccess("Electoral Literacy saved.");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleSaveBasicInfo = async () => {
    const formFields: Record<string, string | number> = {
      institution_status: status.institutionStatus,
      by_gender: status.byGender,
      by_shift_regular: status.byShiftRegular ? 1 : 0,
      by_shift_day: status.byShiftDay ? 1 : 0,
      by_shift_evening: status.byShiftEvening ? 1 : 0,
      minority_institution: status.minorityInstitution,
      minority_religious: status.minorityReligious,
      minority_linguistic: status.minorityLinguistic,
      minority_other: status.minorityOther,
      years_completed: yearsCompleted,
      cpe_recognized: status.cpeRecognized,
      recognized_by_agency: status.recognizedByAgency,
      agency_name: status.agencyName,
      agency_recognition_date: status.agencyRecognitionDate,
      autonomy_conferment: status.autonomyConferment,
      autonomous_applied: status.autonomousApplied,
      location_type: location.locationType,
      campus_area_acres: location.campusAreaAcres,
      built_up_area_sq_mts: location.builtUpAreaSqMts,
    };
    statutoryRows.forEach((row, i) => {
      formFields[`sra_date${i}`] = row.date;
      formFields[`sra_validity${i}`] = row.validityMonths;
      formFields[`sra_remarks${i}`] = row.remarks;
    });
    try {
      await saveSsrBasicInfoColg(formFields, "basicbtn_colg", 0);
      toastSuccess("Basic Information saved.");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleMinorityFileChange = async (file: File | undefined) => {
    if (!file) return;
    setMinorityFile(file);
    try {
      await uploadSsrProfileFile(file, "minority_file");
      toastSuccess("Minority institution document uploaded.");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleAutonomyFileChange = async (file: File | undefined) => {
    if (!file) return;
    setAutonomyFile(file);
    try {
      await uploadSsrProfileFile(file, "autonomy_file");
      toastSuccess("Autonomy document uploaded.");
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const mainCampus = SSR_LOCATION[0];

  return (
    <>
      <PageContainer className="pt-0">
        <div className="app-card overflow-hidden">
          <Tabs defaultValue="basic">
            <div className="overflow-x-auto border-b border-border bg-muted/20">
              <TabsList className={naacTabListClass}>
                {TABS.map((t) => (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className={naacTabTriggerClass}
                  >
                    {t.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ===================== Basic Information ===================== */}
            <TabsContent value="basic" className="m-0 p-4">
              <NaacPrimaryPanel title="Basics Information">
                {/* 1. Name and Address of the College */}
                <NaacDefaultPanel title="Name and Address of the College">
                  <NaacBorderedTable>
                    <tbody>
                      <tr>
                        <NaacTd className="w-[20%]">Name</NaacTd>
                        <NaacTd value colSpan={3}>
                          {SSR_COLLEGE_ADDRESS.Name}
                        </NaacTd>
                      </tr>
                      <tr>
                        <NaacTd>Address</NaacTd>
                        <NaacTd value colSpan={3}>
                          {SSR_COLLEGE_ADDRESS.Address}
                        </NaacTd>
                      </tr>
                      <tr>
                        <NaacTd>City</NaacTd>
                        <NaacTd value>{SSR_COLLEGE_ADDRESS.City}</NaacTd>
                        <NaacTd>Pin</NaacTd>
                        <NaacTd value>{SSR_COLLEGE_ADDRESS.Pin}</NaacTd>
                      </tr>
                      <tr>
                        <NaacTd>State</NaacTd>
                        <NaacTd value>{SSR_COLLEGE_ADDRESS.State}</NaacTd>
                        <NaacTd>Website</NaacTd>
                        <NaacTd value>{SSR_COLLEGE_ADDRESS.Website}</NaacTd>
                      </tr>
                    </tbody>
                  </NaacBorderedTable>
                </NaacDefaultPanel>

                {/* 2. Contacts for Communication */}
                <NaacDefaultPanel title="Contacts for Communication">
                  <NaacSimpleTable
                    columns={[
                      { key: "Designation", header: "Designation" },
                      { key: "Name", header: "Name" },
                      {
                        key: "TelephonewithSTDCode",
                        header: "Telephone with STD Code",
                      },
                      { key: "Mobile", header: "Mobile" },
                      { key: "Fax", header: "Fax" },
                      { key: "Email", header: "Email" },
                    ]}
                    rows={SSR_CONTACTS}
                  />
                </NaacDefaultPanel>

                {/* 3. Status of the Institution */}
                <NaacDefaultPanel title="Status of the Institution">
                  <NaacBorderedTable>
                    <tbody>
                      <tr>
                        <NaacTd className="w-[35%]">Institution Status</NaacTd>
                        <NaacTd value />
                      </tr>
                      <tr>
                        <NaacTd />
                        <NaacTd value>Private</NaacTd>
                      </tr>
                      <tr>
                        <NaacTd />
                        <NaacTd value>Self Financing</NaacTd>
                      </tr>
                    </tbody>
                  </NaacBorderedTable>
                </NaacDefaultPanel>

                {/* 4. Type of Institution */}
                <NaacDefaultPanel title="Type of Institution">
                  <NaacBorderedTable>
                    <tbody>
                      <tr>
                        <NaacTd className="w-[35%]">By Gender</NaacTd>
                        <NaacTd>
                          <select
                            className={`max-w-xs ${nativeSelectClass}`}
                            value={status.byGender}
                            onChange={(e) =>
                              setStatus((s) => ({
                                ...s,
                                byGender: e.target.value,
                              }))
                            }
                          >
                            <option value="0">Select</option>
                            <option value="1">For Men</option>
                            <option value="2">For Women</option>
                            <option value="3">Co-education</option>
                          </select>
                        </NaacTd>
                      </tr>
                      <tr>
                        <NaacTd>By Shift</NaacTd>
                        <NaacTd>
                          <div className="flex flex-wrap items-center gap-4 text-sm">
                            {(
                              [
                                "byShiftRegular",
                                "byShiftDay",
                                "byShiftEvening",
                              ] as const
                            ).map((key, i) => (
                              <label
                                key={key}
                                className="flex items-center gap-1.5"
                              >
                                <input
                                  type="checkbox"
                                  checked={status[key]}
                                  onChange={(e) =>
                                    setStatus((s) => ({
                                      ...s,
                                      [key]: e.target.checked,
                                    }))
                                  }
                                />
                                {["Regular", "Day", "Evening"][i]}
                              </label>
                            ))}
                          </div>
                        </NaacTd>
                      </tr>
                    </tbody>
                  </NaacBorderedTable>
                </NaacDefaultPanel>

                {/* 5. Recognized Minority Institution */}
                <NaacDefaultPanel title="Recognized Minority Institution">
                  <NaacBorderedTable>
                    <tbody>
                      <tr>
                        <NaacTd className="w-[35%]">
                          If it is a recognized minority institution
                        </NaacTd>
                        <NaacTd>
                          <select
                            className={`max-w-xs ${nativeSelectClass}`}
                            value={status.minorityInstitution}
                            onChange={(e) =>
                              setStatus((s) => ({
                                ...s,
                                minorityInstitution: e.target.value as
                                  | "no"
                                  | "yes",
                              }))
                            }
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                          <div className="mt-2">
                            <input
                              type="file"
                              className="text-sm"
                              onChange={(e) =>
                                handleMinorityFileChange(e.target.files?.[0])
                              }
                            />
                            {minorityFile && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Uploaded: {minorityFile.name}
                              </p>
                            )}
                          </div>
                        </NaacTd>
                      </tr>
                      <tr>
                        <NaacTd>If yes, specify minority status</NaacTd>
                        <NaacTd />
                      </tr>
                      <tr>
                        <NaacTd>Religious</NaacTd>
                        <NaacTd>
                          <Input
                            disabled={status.minorityInstitution === "no"}
                            maxLength={100}
                            value={status.minorityReligious}
                            onChange={(e) =>
                              setStatus((s) => ({
                                ...s,
                                minorityReligious: e.target.value,
                              }))
                            }
                          />
                        </NaacTd>
                      </tr>
                      <tr>
                        <NaacTd>Linguistic</NaacTd>
                        <NaacTd>
                          <Input
                            disabled={status.minorityInstitution === "no"}
                            maxLength={100}
                            value={status.minorityLinguistic}
                            onChange={(e) =>
                              setStatus((s) => ({
                                ...s,
                                minorityLinguistic: e.target.value,
                              }))
                            }
                          />
                        </NaacTd>
                      </tr>
                      <tr>
                        <NaacTd>Any Other</NaacTd>
                        <NaacTd>
                          <Input
                            disabled={status.minorityInstitution === "no"}
                            maxLength={100}
                            value={status.minorityOther}
                            onChange={(e) =>
                              setStatus((s) => ({
                                ...s,
                                minorityOther: e.target.value,
                              }))
                            }
                          />
                        </NaacTd>
                      </tr>
                    </tbody>
                  </NaacBorderedTable>
                </NaacDefaultPanel>

                {/* 6. Establishment Details */}
                <NaacDefaultPanel title="Establishment Details">
                  <NaacBorderedTable>
                    <tbody>
                      <NaacLabelValueRow label="Date of establishment of the college">
                        {SSR_ESTABLISHMENT.date}
                      </NaacLabelValueRow>
                      <tr>
                        <NaacTd className="w-[35%]">
                          Number of academic year completed till date
                        </NaacTd>
                        <NaacTd>
                          <Input
                            className="max-w-[140px]"
                            value={yearsCompleted}
                            onChange={(e) => setYearsCompleted(e.target.value)}
                          />
                        </NaacTd>
                      </tr>
                      <tr>
                        <NaacTd
                          colSpan={2}
                          className="bg-[#DCDCDC] font-bold text-[#333]"
                        >
                          University to which the college is affiliated/ or
                          which governs the college (if it is a constituent
                          college)
                        </NaacTd>
                      </tr>
                    </tbody>
                  </NaacBorderedTable>
                  <NaacBorderedTable fixed={false} className="mt-3">
                    <thead>
                      <tr>
                        <NaacTh>State</NaacTh>
                        <NaacTh>University Name</NaacTh>
                        <NaacTh>View Document</NaacTh>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <NaacTd value>
                          {SSR_ESTABLISHMENT.universityState}
                        </NaacTd>
                        <NaacTd value>
                          {SSR_ESTABLISHMENT.universityName}
                        </NaacTd>
                        <NaacTd value>-</NaacTd>
                      </tr>
                    </tbody>
                  </NaacBorderedTable>
                </NaacDefaultPanel>

                {/* 7a. Details of UGC Recognition */}
                <NaacDefaultPanel title="Details of UGC Recognition">
                  <NaacSimpleTable
                    columns={[
                      { key: "section", header: "Under Section" },
                      { key: "date", header: "Date" },
                      { key: "document", header: "View Document" },
                    ]}
                    rows={SSR_UGC_RECOGNITION}
                  />
                </NaacDefaultPanel>

                {/* 7b. Details of Recognition/Approval by Statutory/Regulatory bodies */}
                <NaacDefaultPanel title="Details of Recognition/Approval by Statutory/Regulatory bodies like AICTE, NCTE, MCI, DCI, PCI, RCI etc (other than UGC)">
                  <NaacBorderedTable fixed={false}>
                    <thead>
                      <tr>
                        <NaacTh>Statutory Regulatory Authority</NaacTh>
                        <NaacTh>
                          Recognition/Approval details Institution/Department
                          Program
                        </NaacTh>
                        <NaacTh>Day,Month and Year(dd/mm/yyyy)</NaacTh>
                        <NaacTh>Validity in months</NaacTh>
                        <NaacTh>Remarks</NaacTh>
                      </tr>
                    </thead>
                    <tbody>
                      {statutoryRows.map((row, i) => (
                        <tr key={row.authority}>
                          <NaacTd value>{row.authority}</NaacTd>
                          <NaacTd>
                            {row.documentUrl ? (
                              <a
                                href={row.documentUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[#337ab7] underline"
                              >
                                View Document
                              </a>
                            ) : null}
                          </NaacTd>
                          <NaacTd>
                            <Input
                              className="h-9"
                              placeholder="dd/mm/yyyy"
                              maxLength={10}
                              value={row.date}
                              onChange={(e) =>
                                setStatutoryRows((prev) =>
                                  prev.map((r, idx) =>
                                    idx === i
                                      ? { ...r, date: e.target.value }
                                      : r,
                                  ),
                                )
                              }
                            />
                          </NaacTd>
                          <NaacTd>
                            <Input
                              className="h-9"
                              maxLength={4}
                              value={row.validityMonths}
                              onChange={(e) =>
                                setStatutoryRows((prev) =>
                                  prev.map((r, idx) =>
                                    idx === i
                                      ? {
                                          ...r,
                                          validityMonths: e.target.value,
                                        }
                                      : r,
                                  ),
                                )
                              }
                            />
                          </NaacTd>
                          <NaacTd>
                            <Textarea
                              rows={3}
                              maxLength={255}
                              value={row.remarks}
                              onChange={(e) =>
                                setStatutoryRows((prev) =>
                                  prev.map((r, idx) =>
                                    idx === i
                                      ? { ...r, remarks: e.target.value }
                                      : r,
                                  ),
                                )
                              }
                            />
                          </NaacTd>
                        </tr>
                      ))}
                    </tbody>
                  </NaacBorderedTable>
                </NaacDefaultPanel>

                {/* 7c. Details of Autonomy */}
                <NaacDefaultPanel title="Details of Autonomy">
                  <NaacBorderedTable>
                    <tbody>
                      <tr>
                        <NaacTd className="w-[35%]">
                          Does the affiliating university Act provide for
                          conferment of autonomy (as recognized by the UGC), on
                          its affiliated colleges?
                        </NaacTd>
                        <NaacTd>
                          <select
                            className={`max-w-xs ${nativeSelectClass}`}
                            value={status.autonomyConferment}
                            onChange={(e) =>
                              setStatus((s) => ({
                                ...s,
                                autonomyConferment: e.target.value as
                                  | "no"
                                  | "yes",
                              }))
                            }
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                          <div className="mt-2">
                            <input
                              type="file"
                              className="text-sm"
                              onChange={(e) =>
                                handleAutonomyFileChange(e.target.files?.[0])
                              }
                            />
                            {autonomyFile && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Uploaded: {autonomyFile.name}
                              </p>
                            )}
                          </div>
                        </NaacTd>
                      </tr>
                      <tr>
                        <NaacTd>
                          If yes, has the College applied for availing the
                          autonomous status?
                        </NaacTd>
                        <NaacTd>
                          <Input
                            className="max-w-xs"
                            disabled={status.autonomyConferment === "no"}
                            value={status.autonomousApplied}
                            onChange={(e) =>
                              setStatus((s) => ({
                                ...s,
                                autonomousApplied: e.target.value,
                              }))
                            }
                          />
                        </NaacTd>
                      </tr>
                    </tbody>
                  </NaacBorderedTable>
                </NaacDefaultPanel>

                {/* 7d. Recognitions */}
                <NaacDefaultPanel title="Recognitions">
                  <NaacBorderedTable>
                    <tbody>
                      <NaacLabelValueRow label="Is the College recognized by UGC as a College with Potential for Excellence (CPE)?">
                        {status.cpeRecognized}
                      </NaacLabelValueRow>
                    </tbody>
                  </NaacBorderedTable>
                  <NaacBorderedTable className="mt-3">
                    <tbody>
                      <tr>
                        <NaacTd className="w-[35%]">
                          Is the College recognized for its performance by any
                          other governmental agency?
                        </NaacTd>
                        <NaacTd>
                          <select
                            className={`max-w-xs ${nativeSelectClass}`}
                            value={status.recognizedByAgency}
                            onChange={(e) =>
                              setStatus((s) => ({
                                ...s,
                                recognizedByAgency: e.target.value as
                                  | "no"
                                  | "yes",
                              }))
                            }
                          >
                            <option value="no">No</option>
                            <option value="yes">Yes</option>
                          </select>
                        </NaacTd>
                      </tr>
                      <tr>
                        <NaacTd>If yes, name of the agency</NaacTd>
                        <NaacTd>
                          <Input
                            disabled={status.recognizedByAgency === "no"}
                            value={status.agencyName}
                            onChange={(e) =>
                              setStatus((s) => ({
                                ...s,
                                agencyName: e.target.value,
                              }))
                            }
                          />
                        </NaacTd>
                      </tr>
                      <tr>
                        <NaacTd>Date of recognition</NaacTd>
                        <NaacTd>
                          <Input
                            placeholder="dd/mm/yyyy"
                            disabled={status.recognizedByAgency === "no"}
                            value={status.agencyRecognitionDate}
                            onChange={(e) =>
                              setStatus((s) => ({
                                ...s,
                                agencyRecognitionDate: e.target.value,
                              }))
                            }
                          />
                        </NaacTd>
                      </tr>
                    </tbody>
                  </NaacBorderedTable>
                </NaacDefaultPanel>

                {/* 7e. Location and Area of the Campus */}
                <NaacDefaultPanel title="Location and Area of the Campus">
                  <NaacBorderedTable fixed={false}>
                    <thead>
                      <tr>
                        <NaacTh>Campus Type</NaacTh>
                        <NaacTh>Address</NaacTh>
                        <NaacTh>Location *</NaacTh>
                        <NaacTh>Campus Area in Acres</NaacTh>
                        <NaacTh>Built up Area in sq.mts.</NaacTh>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <NaacTd value>{mainCampus?.CampusType ?? ""}</NaacTd>
                        <NaacTd value>{mainCampus?.Address ?? ""}</NaacTd>
                        <NaacTd>
                          <select
                            className={nativeSelectClass}
                            value={location.locationType}
                            onChange={(e) =>
                              setLocation((l) => ({
                                ...l,
                                locationType: e.target.value,
                              }))
                            }
                          >
                            <option value="">--Select--</option>
                            <option value="Urban">Urban</option>
                            <option value="Semi-urban">Semi-urban</option>
                            <option value="Rural">Rural</option>
                            <option value="Tribal">Tribal</option>
                            <option value="Hill">Hill</option>
                          </select>
                        </NaacTd>
                        <NaacTd>
                          <Input
                            maxLength={8}
                            value={location.campusAreaAcres}
                            onChange={(e) =>
                              setLocation((l) => ({
                                ...l,
                                campusAreaAcres: e.target.value,
                              }))
                            }
                          />
                        </NaacTd>
                        <NaacTd>
                          <Input
                            maxLength={8}
                            value={location.builtUpAreaSqMts}
                            onChange={(e) =>
                              setLocation((l) => ({
                                ...l,
                                builtUpAreaSqMts: e.target.value,
                              }))
                            }
                          />
                        </NaacTd>
                      </tr>
                    </tbody>
                  </NaacBorderedTable>
                </NaacDefaultPanel>

                <div className="flex justify-end">
                  <Button onClick={handleSaveBasicInfo}>Save and Next</Button>
                </div>
              </NaacPrimaryPanel>
            </TabsContent>

            {/* ===================== Academic Information ===================== */}
            <TabsContent value="academic" className="m-0 p-4">
              <SsrAcademicInformationTab />
            </TabsContent>

            {/* ===================== Evaluative Report of Departments ===================== */}
            <TabsContent value="evaluative" className="m-0 p-4">
              <NaacPrimaryPanel>
                <div className="rounded border border-amber-300 bg-amber-50 p-4 text-center text-sm text-amber-900">
                  <strong>Info!</strong> Not Applicable for Affiliated Colleges.
                </div>
              </NaacPrimaryPanel>
            </TabsContent>

            {/* ===================== NEP ===================== */}
            <TabsContent value="nep" className="m-0 p-4">
              <NaacPrimaryPanel title="Institutional preparedness for NEP">
                <div className="space-y-6">
                  {SSR_NEP_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-start"
                    >
                      <label className="text-sm font-normal text-[#333] md:col-span-4">
                        {item.label}
                      </label>
                      <div className="md:col-span-6">
                        <Textarea
                          rows={8}
                          className="min-h-[160px] resize-y border-[#ccc] text-sm"
                          value={nepText[item.id] ?? ""}
                          onChange={(e) =>
                            setNepText((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      className="w-[150px] bg-[#f0ad4e] text-white hover:bg-[#ec971f]"
                      onClick={handleSaveNep}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </NaacPrimaryPanel>
            </TabsContent>

            {/* ===================== Electoral Literacy ===================== */}
            <TabsContent value="literacy" className="m-0 p-4">
              <NaacPrimaryPanel title="Institutional Initiatives for Electoral Literacy">
                <div className="space-y-6">
                  {SSR_LITERACY_ITEMS.map((item) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-1 gap-3 md:grid-cols-12 md:items-start"
                    >
                      <label className="text-sm font-normal text-[#333] md:col-span-4">
                        {item.label}
                      </label>
                      <div className="md:col-span-6">
                        <Textarea
                          rows={8}
                          className="min-h-[160px] resize-y border-[#ccc] text-sm"
                          value={literacyText[item.id] ?? ""}
                          onChange={(e) =>
                            setLiteracyText((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-center">
                    <Button
                      type="button"
                      className="w-[150px] bg-[#f0ad4e] text-white hover:bg-[#ec971f]"
                      onClick={handleSaveLiteracy}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              </NaacPrimaryPanel>
            </TabsContent>
          </Tabs>
        </div>
      </PageContainer>
    </>
  );
}
