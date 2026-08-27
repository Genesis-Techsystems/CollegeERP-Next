"use client";

/**
 * Angular `my-profile` — staff / admin / evaluator self-service profile.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Monitor } from "lucide-react";
import { PageContainer, PageHeader } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import { DatePicker } from "@/common/components/date-picker";
import { useSessionContext } from "@/context/SessionContext";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  getEmployeeProfileByUserId,
  getProfileLoginUser,
  listProfileCastes,
  listProfileGenders,
  listProfileMaritalStatuses,
  listProfileNationalities,
  listProfileReligions,
  listProfileSubCastesByCaste,
  listProfileTitles,
  loadEvaluatorProfileBundle,
  profileDateToYmd,
  profileParseDate,
  saveEvaluatorProfileBankDetails,
  saveEvaluatorProfileDetails,
  updateEmployeeProfile,
  uploadEmployeeProfilePhoto,
  type EmployeeProfileDetails,
  type ProfileGmOption,
  type ProfileLoginUser,
} from "@/services";
import { ProfileChangePasswordDialog } from "./ProfileChangePasswordDialog";

type FormState = {
  joiningDate: Date | null;
  email: string;
  titleId: string;
  firstName: string;
  middleName: string;
  lastName: string;
  genderId: string;
  fatherName: string;
  motherName: string;
  nationalityId: string;
  religionId: string;
  casteId: string;
  subCasteId: string;
  dateOfBirth: Date | null;
  maritalStatusId: string;
  weddingDate: Date | null;
  mobile: string;
  address: string;
  aadhar: string;
  panCardNo: string;
  travelToEvaluationCenter: string;
  bankName: string;
  branchName: string;
  bankAddress: string;
  phone: string;
  ifscCode: string;
  accountNumber: string;
  ddPayableAddress: string;
  upi: string;
};

const EMPTY_FORM: FormState = {
  joiningDate: null,
  email: "",
  titleId: "",
  firstName: "",
  middleName: "",
  lastName: "",
  genderId: "",
  fatherName: "",
  motherName: "",
  nationalityId: "",
  religionId: "",
  casteId: "",
  subCasteId: "",
  dateOfBirth: null,
  maritalStatusId: "",
  weddingDate: null,
  mobile: "",
  address: "",
  aadhar: "",
  panCardNo: "",
  travelToEvaluationCenter: "",
  bankName: "",
  branchName: "",
  bankAddress: "",
  phone: "",
  ifscCode: "",
  accountNumber: "",
  ddPayableAddress: "",
  upi: "",
};

function displayName(row: EmployeeProfileDetails | null): string {
  if (!row) return "";
  return [row.firstName, row.middleName, row.lastName]
    .map((p) => String(p ?? "").trim())
    .filter(Boolean)
    .join(" ");
}

function idStr(v: unknown): string {
  if (v == null || v === "") return "";
  return String(v);
}

export function MyProfilePage() {
  const { user } = useSessionContext();
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loginUser, setLoginUser] = useState<ProfileLoginUser | null>(null);
  const [employee, setEmployee] = useState<EmployeeProfileDetails | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const [titles, setTitles] = useState<ProfileGmOption[]>([]);
  const [genders, setGenders] = useState<ProfileGmOption[]>([]);
  const [nationalities, setNationalities] = useState<ProfileGmOption[]>([]);
  const [religions, setReligions] = useState<ProfileGmOption[]>([]);
  const [maritalStatuses, setMaritalStatuses] = useState<ProfileGmOption[]>(
    [],
  );
  const [castes, setCastes] = useState<ProfileGmOption[]>([]);
  const [subCastes, setSubCastes] = useState<ProfileGmOption[]>([]);

  const [isEvaluator, setIsEvaluator] = useState(false);
  const [evaluatorProfileId, setEvaluatorProfileId] = useState(0);
  const [evaluatorProfilePayload, setEvaluatorProfilePayload] = useState<
    Record<string, unknown> | null
  >(null);

  const photoSrc = useMemo(() => {
    const p = String(employee?.photoPath ?? "").trim();
    return p || undefined;
  }, [employee?.photoPath]);

  function patchForm(partial: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...partial }));
  }

  async function loadMasters() {
    const [t, g, n, r, m, c] = await Promise.all([
      listProfileTitles(),
      listProfileGenders(),
      listProfileNationalities(),
      listProfileReligions(),
      listProfileMaritalStatuses(),
      listProfileCastes(),
    ]);
    setTitles(t);
    setGenders(g);
    setNationalities(n);
    setReligions(r);
    setMaritalStatuses(m);
    setCastes(c);
  }

  async function loadProfile() {
    const userId = Number(user?.userId) || 0;
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      await loadMasters();
      const lu = await getProfileLoginUser(userId);
      setLoginUser(lu);
      const emp = await getEmployeeProfileByUserId(userId);
      setEmployee(emp);

      const evalBundle = await loadEvaluatorProfileBundle(userId);
      setIsEvaluator(evalBundle.isEvaluator);
      setEvaluatorProfileId(evalBundle.profileId);
      setEvaluatorProfilePayload(evalBundle.profile);

      const next: FormState = {
        ...EMPTY_FORM,
        joiningDate: profileParseDate(emp?.joiningDate),
        email: String(emp?.email ?? ""),
        titleId: idStr(emp?.titleId),
        firstName: String(emp?.firstName ?? ""),
        middleName: String(emp?.middleName ?? ""),
        lastName: String(emp?.lastName ?? ""),
        genderId: idStr(emp?.genderId),
        fatherName: String(emp?.fatherName ?? ""),
        motherName: String(emp?.motherName ?? ""),
        nationalityId: idStr(emp?.nationalityId),
        religionId: idStr(emp?.religionId),
        casteId: idStr(emp?.casteId),
        subCasteId: idStr(emp?.subCasteId),
        dateOfBirth: profileParseDate(emp?.dateOfBirth),
        maritalStatusId: idStr(emp?.maritalStatusId),
        weddingDate: profileParseDate(emp?.weddingDate),
        mobile: String(emp?.mobile ?? ""),
        address: String(emp?.address ?? ""),
      };
      if (evalBundle.isEvaluator) {
        next.aadhar = String(evalBundle.profile?.aadhar ?? "");
        next.panCardNo = String(evalBundle.profile?.panCardNo ?? "");
        next.travelToEvaluationCenter = String(
          evalBundle.profile?.travelToEvaluationCenter ?? "",
        );
        next.phone = String(evalBundle.bank?.phone ?? "");
        next.bankName = String(evalBundle.bank?.bankName ?? "");
        next.branchName = String(evalBundle.bank?.branchName ?? "");
        next.bankAddress = String(evalBundle.bank?.bankAddress ?? "");
        next.ifscCode = String(evalBundle.bank?.ifscCode ?? "");
        next.accountNumber = String(evalBundle.bank?.accountNumber ?? "");
        next.ddPayableAddress = String(
          evalBundle.bank?.ddPayableAddress ?? "",
        );
        next.upi = String(evalBundle.bank?.upi ?? "");
      }
      setForm(next);

      const casteId = Number(emp?.casteId) || 0;
      if (casteId) {
        setSubCastes(await listProfileSubCastesByCaste(casteId));
      } else {
        setSubCastes([]);
      }
    } catch (err) {
      toastError(err, "Failed to load profile");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- load once per session user
  }, [user?.userId]);

  async function onCasteChange(value: string | null) {
    const next = value ?? "";
    patchForm({ casteId: next, subCasteId: "" });
    const casteId = Number(next) || 0;
    if (!casteId) {
      setSubCastes([]);
      return;
    }
    try {
      setSubCastes(await listProfileSubCastesByCaste(casteId));
    } catch {
      setSubCastes([]);
    }
  }

  async function onPhotoSelected(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file || !employee) return;
    const fd = new FormData();
    fd.append("orgCode", String(employee.orgCode ?? ""));
    fd.append("collegeCode", String(employee.collegeCode ?? ""));
    fd.append("employeeId", String(employee.employeeId ?? ""));
    fd.append("empNumber", String(employee.empNumber ?? ""));
    fd.append("photoFile", file, file.name);
    try {
      await uploadEmployeeProfilePhoto(fd);
      toastSuccess("Photo updated successfully.");
      await loadProfile();
    } catch (err) {
      toastError(err, "Failed to upload photo");
    } finally {
      if (photoInputRef.current) photoInputRef.current.value = "";
    }
  }

  async function onUpdate() {
    if (!employee) return;
    if (!form.firstName.trim()) {
      toastError(new Error("First Name is required"));
      return;
    }
    setSaving(true);
    try {
      if (isEvaluator && evaluatorProfilePayload) {
        await saveEvaluatorProfileBankDetails([
          {
            examEvaluatorProfilesId: evaluatorProfileId,
            bankName: form.bankName,
            branchName: form.branchName,
            bankAddress: form.bankAddress,
            phone: form.phone,
            ifscCode: form.ifscCode,
            accountNumber: form.accountNumber,
            ddPayableAddress: form.ddPayableAddress,
            upi: form.upi,
            isActive: true,
          },
        ]);
        await saveEvaluatorProfileDetails({
          ...evaluatorProfilePayload,
          aadhar: form.aadhar,
          panCardNo: form.panCardNo,
          travelToEvaluationCenter: form.travelToEvaluationCenter,
        });
      }

      const payload: EmployeeProfileDetails = {
        ...employee,
        email: form.email,
        joiningDate: profileDateToYmd(form.joiningDate),
        titleId: form.titleId ? Number(form.titleId) : null,
        firstName: form.firstName,
        middleName: form.middleName,
        lastName: form.lastName,
        genderId: form.genderId ? Number(form.genderId) : null,
        fatherName: form.fatherName,
        motherName: form.motherName,
        nationalityId: form.nationalityId ? Number(form.nationalityId) : null,
        religionId: form.religionId ? Number(form.religionId) : null,
        casteId: form.casteId ? Number(form.casteId) : null,
        subCasteId: form.subCasteId ? Number(form.subCasteId) : null,
        dateOfBirth: profileDateToYmd(form.dateOfBirth),
        maritalStatusId: form.maritalStatusId
          ? Number(form.maritalStatusId)
          : null,
        weddingDate: profileDateToYmd(form.weddingDate),
        mobile: form.mobile,
        address: form.address,
      };
      await updateEmployeeProfile(payload);
      toastSuccess("Profile updated successfully.");
      await loadProfile();
    } catch (err) {
      toastError(err, "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <PageContainer>
        <PageHeader title="Profile" />
        <p className="text-sm text-muted-foreground">Loading profile…</p>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader title="Profile" />
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 rounded-md border bg-card p-5 shadow-sm lg:max-w-[280px]">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoSrc}
                alt=""
                className="h-24 w-24 rounded-full object-cover bg-muted"
                onError={(e) => {
                  e.currentTarget.src =
                    "data:image/svg+xml," +
                    encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96"><rect fill="#e5e7eb" width="100%" height="100%"/><text x="50%" y="54%" text-anchor="middle" fill="#9ca3af" font-size="12">No photo</text></svg>`,
                    );
                }}
              />
              <button
                type="button"
                className="absolute bottom-0 right-0 rounded-full bg-background p-1.5 text-blue-600 shadow border"
                aria-label="Upload photo"
                onClick={() => photoInputRef.current?.click()}
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input
                ref={photoInputRef}
                type="file"
                accept=".png,.jpg,.jpeg"
                className="hidden"
                onChange={(e) => void onPhotoSelected(e.target.files)}
              />
            </div>
            <div>
              <h3 className="text-base font-semibold leading-tight">
                {displayName(employee)}
              </h3>
              <p className="text-sm text-muted-foreground">
                {String(employee?.empNumber ?? "")}
              </p>
              <button
                type="button"
                className="mt-1 text-sm text-primary underline underline-offset-2"
                onClick={() => setPasswordOpen(true)}
              >
                Change Password
              </button>
            </div>
            <hr className="w-full border-border" />
            <div className="space-y-2 text-sm">
              <p className="font-semibold">{String(employee?.collegeName ?? "")}</p>
              <p>
                {String(employee?.deptName ?? "")}
                {employee?.designationName
                  ? ` (${String(employee.designationName)})`
                  : ""}
              </p>
              <p>{String(employee?.mobile ?? "")}</p>
            </div>
          </div>
        </aside>

        <section className="min-w-0 flex-1 rounded-md border bg-card p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2 border-b pb-2">
            <Monitor className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold">Edit Profile</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <FormField label="Title">
              <Select
                value={form.titleId || null}
                onChange={(v) => patchForm({ titleId: v ?? "" })}
                options={titles}
                placeholder="Title"
                clearable
              />
            </FormField>
            <FormField label="First Name (as per SSC)" required>
              <Input
                value={form.firstName}
                onChange={(e) => patchForm({ firstName: e.target.value })}
              />
            </FormField>
            <FormField label="Middle Name (as per SSC)">
              <Input
                value={form.middleName}
                onChange={(e) => patchForm({ middleName: e.target.value })}
              />
            </FormField>
            <FormField label="Last Name (as per SSC)">
              <Input
                value={form.lastName}
                onChange={(e) => patchForm({ lastName: e.target.value })}
              />
            </FormField>
            <FormField label="Gender" className="sm:col-span-2 lg:col-span-3">
              <div className="flex flex-wrap gap-4 pt-1">
                {genders.map((g) => (
                  <label
                    key={g.value}
                    className="flex items-center gap-2 text-sm"
                  >
                    <input
                      type="radio"
                      name="genderId"
                      checked={form.genderId === g.value}
                      onChange={() => patchForm({ genderId: g.value })}
                    />
                    {g.label}
                  </label>
                ))}
              </div>
            </FormField>
            <FormField label="Father Name">
              <Input
                value={form.fatherName}
                onChange={(e) => patchForm({ fatherName: e.target.value })}
              />
            </FormField>
            <FormField label="Mother Name">
              <Input
                value={form.motherName}
                onChange={(e) => patchForm({ motherName: e.target.value })}
              />
            </FormField>
            <FormField label="Nationality">
              <Select
                value={form.nationalityId || null}
                onChange={(v) => patchForm({ nationalityId: v ?? "" })}
                options={nationalities}
                placeholder="Nationality"
                clearable
              />
            </FormField>
            <FormField label="Religion">
              <Select
                value={form.religionId || null}
                onChange={(v) => patchForm({ religionId: v ?? "" })}
                options={religions}
                placeholder="Religion"
                clearable
              />
            </FormField>
            <FormField label="Caste">
              <Select
                value={form.casteId || null}
                onChange={(v) => void onCasteChange(v)}
                options={castes}
                placeholder="Caste"
                clearable
              />
            </FormField>
            {subCastes.length > 0 ? (
              <FormField label="Sub Caste">
                <Select
                  value={form.subCasteId || null}
                  onChange={(v) => patchForm({ subCasteId: v ?? "" })}
                  options={subCastes}
                  placeholder="Sub Caste"
                  clearable
                />
              </FormField>
            ) : null}
            <FormField label="Date of Birth">
              <DatePicker
                value={form.dateOfBirth}
                onChange={(d) => patchForm({ dateOfBirth: d })}
              />
            </FormField>
            <FormField label="Marital Status">
              <Select
                value={form.maritalStatusId || null}
                onChange={(v) => patchForm({ maritalStatusId: v ?? "" })}
                options={maritalStatuses}
                placeholder="Marital Status"
                clearable
              />
            </FormField>
            <FormField label="Wedding Date">
              <DatePicker
                value={form.weddingDate}
                onChange={(d) => patchForm({ weddingDate: d })}
              />
            </FormField>
            <FormField label="Joining Date">
              <DatePicker
                value={form.joiningDate}
                onChange={(d) => patchForm({ joiningDate: d })}
              />
            </FormField>
            <FormField label="Mobile Number" required>
              <Input
                type="tel"
                value={form.mobile}
                onChange={(e) => patchForm({ mobile: e.target.value })}
              />
            </FormField>
            <FormField label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => patchForm({ email: e.target.value })}
              />
            </FormField>
            <FormField label="Address" className="sm:col-span-2">
              <Input
                value={form.address}
                onChange={(e) => patchForm({ address: e.target.value })}
              />
            </FormField>

            {isEvaluator ? (
              <>
                <FormField label="Aadhar">
                  <Input
                    value={form.aadhar}
                    onChange={(e) => patchForm({ aadhar: e.target.value })}
                  />
                </FormField>
                <FormField label="Pan Card No.">
                  <Input
                    value={form.panCardNo}
                    onChange={(e) => patchForm({ panCardNo: e.target.value })}
                  />
                </FormField>
                <FormField label="Travel to Evaluation center in Kms">
                  <Input
                    type="number"
                    value={form.travelToEvaluationCenter}
                    onChange={(e) =>
                      patchForm({ travelToEvaluationCenter: e.target.value })
                    }
                  />
                </FormField>
              </>
            ) : null}
          </div>

          {isEvaluator ? (
            <div className="mt-6">
              <div className="mb-3 flex items-center gap-2 border-b pb-2">
                <span className="text-sm font-semibold">Bank Details</span>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <FormField label="Bank Name">
                  <Input
                    value={form.bankName}
                    onChange={(e) => patchForm({ bankName: e.target.value })}
                  />
                </FormField>
                <FormField label="Branch Name">
                  <Input
                    value={form.branchName}
                    onChange={(e) => patchForm({ branchName: e.target.value })}
                  />
                </FormField>
                <FormField label="Account Number">
                  <Input
                    value={form.accountNumber}
                    onChange={(e) =>
                      patchForm({ accountNumber: e.target.value })
                    }
                  />
                </FormField>
                <FormField label="IFSC Code">
                  <Input
                    value={form.ifscCode}
                    onChange={(e) => patchForm({ ifscCode: e.target.value })}
                  />
                </FormField>
                <FormField label="Bank Address">
                  <Input
                    value={form.bankAddress}
                    onChange={(e) => patchForm({ bankAddress: e.target.value })}
                  />
                </FormField>
                <FormField label="Phone no">
                  <Input
                    value={form.phone}
                    onChange={(e) => patchForm({ phone: e.target.value })}
                  />
                </FormField>
                <FormField label="UPI">
                  <Input
                    value={form.upi}
                    onChange={(e) => patchForm({ upi: e.target.value })}
                  />
                </FormField>
              </div>
            </div>
          ) : null}

          <div className="mt-6 flex justify-end">
            <Button type="button" disabled={saving} onClick={() => void onUpdate()}>
              {saving ? "Updating…" : "Update"}
            </Button>
          </div>
        </section>
      </div>

      <ProfileChangePasswordDialog
        open={passwordOpen}
        loginUser={loginUser}
        onClose={() => setPasswordOpen(false)}
      />
    </PageContainer>
  );
}
