"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import noImgLogo from "@/assets/images/no-img-logo.png";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ActiveStatusField, FormField } from "@/common/components/forms";
import { Select } from "@/common/components/select";
import type { City, Country, District, State } from "@/types/organization";
import type { University } from "@/types/university";
import {
  createUniversity,
  listCitiesByDistrict,
  listCountries,
  listDistrictsByState,
  listStatesByCountry,
  updateUniversity,
  uploadUniversityLogo,
} from "@/services";
import { requiredNumber } from "@/lib/zod-fields";

const schema = z.object({
  universityName: z.string().min(1, "University name is required"),
  universityCode: z.string().min(1, "University code is required"),
  universityShortName: z.string().optional(),
  printPrefix: z.string().optional(),
  address: z.string().min(1, "Address is required"),
  mandal: z.string().min(1, "Mandal is required"),
  pinCode: z.string().min(1, "Pin code is required"),
  mobileNumber: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[6-9]\d{9}$/.test(val),
      "Enter a valid 10-digit mobile number",
    ),
  landlineNumber: z.string().optional(),
  email: z
    .string()
    .optional()
    .refine(
      (val) => !val || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val),
      "Enter a valid email address",
    ),
  fax: z.string().optional(),
  googleUrl: z.string().optional(),
  facebookUrl: z.string().optional(),
  linkedinUrl: z.string().optional(),
  countryId: z.number().optional(),
  stateId: z.number().optional(),
  districtId: requiredNumber("District is required"),
  cityId: requiredNumber("City is required"),
  isActive: z.boolean(),
  reason: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface UniversityModalProps {
  open: boolean;
  onClose: () => void;
  university: University | null;
  onSaved: () => void;
}

export default function UniversityModal({
  open,
  onClose,
  university,
  onSaved,
}: Readonly<UniversityModalProps>) {
  const isEditing = university != null;
  const fileRef = useRef<HTMLInputElement>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [countries, setCountries] = useState<Country[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      universityName: "",
      universityCode: "",
      universityShortName: "",
      printPrefix: "",
      address: "",
      mandal: "",
      pinCode: "",
      mobileNumber: "",
      landlineNumber: "",
      email: "",
      fax: "",
      googleUrl: "",
      facebookUrl: "",
      linkedinUrl: "",
      countryId: undefined,
      stateId: undefined,
      districtId: undefined,
      cityId: undefined,
      isActive: true,
      reason: "",
    },
  });

  const countryId = watch("countryId");
  const stateId = watch("stateId");
  const districtId = watch("districtId");

  const countryOptions = useMemo(
    () =>
      countries.map((item) => ({
        value: String(item.countryId),
        label: item.countryName,
      })),
    [countries],
  );
  const stateOptions = useMemo(
    () =>
      states.map((item) => ({
        value: String(item.stateId),
        label: item.stateName,
      })),
    [states],
  );
  const districtOptions = useMemo(
    () =>
      districts.map((item) => ({
        value: String(item.districtId),
        label: item.districtName,
      })),
    [districts],
  );
  const cityOptions = useMemo(
    () =>
      cities.map((item) => ({
        value: String(item.cityId),
        label: item.cityName,
      })),
    [cities],
  );

  let submitLabel = "Save";
  if (isSubmitting) submitLabel = "Saving...";
  else if (isEditing) submitLabel = "Update";

  useEffect(() => {
    if (!open) return;
    listCountries().then(setCountries).catch(console.error);
  }, [open]);

  useEffect(() => {
    if (university) {
      reset({
        universityName: university.universityName,
        universityCode: university.universityCode,
        universityShortName: university.universityShortName ?? "",
        printPrefix: university.printPrefix ?? "",
        address: university.address,
        mandal: university.mandal,
        pinCode: String(university.pinCode ?? ""),
        mobileNumber: university.mobileNumber ?? "",
        landlineNumber: university.landlineNumber ?? "",
        email: university.email ?? "",
        fax: university.fax ?? "",
        googleUrl: university.googleUrl ?? "",
        facebookUrl: university.facebookUrl ?? "",
        linkedinUrl: university.linkedinUrl ?? "",
        countryId: university.countryId ?? undefined,
        stateId: university.stateId ?? undefined,
        districtId: university.districtId,
        cityId: university.cityId,
        isActive: university.isActive,
        reason: university.isActive ? "" : (university.reason ?? ""),
      });
      setLogoPreview(university.logoFileName ?? null);
    } else {
      reset();
      setLogoPreview(null);
    }
    setStates([]);
    setDistricts([]);
    setCities([]);
    setSubmitError(null);
  }, [university, open, reset]);

  useEffect(() => {
    if (countryId == null) {
      setStates([]);
      setDistricts([]);
      setCities([]);
      return;
    }
    listStatesByCountry(countryId).then(setStates).catch(console.error);
  }, [countryId]);

  useEffect(() => {
    if (stateId == null) {
      setDistricts([]);
      setCities([]);
      return;
    }
    listDistrictsByState(stateId).then(setDistricts).catch(console.error);
  }, [stateId]);

  useEffect(() => {
    if (districtId == null) {
      setCities([]);
      return;
    }
    listCitiesByDistrict(districtId).then(setCities).catch(console.error);
  }, [districtId]);

  useEffect(() => {
    if (!university || !open) return;
    if (university.countryId)
      listStatesByCountry(university.countryId)
        .then(setStates)
        .catch(console.error);
    if (university.stateId)
      listDistrictsByState(university.stateId)
        .then(setDistricts)
        .catch(console.error);
    if (university.districtId)
      listCitiesByDistrict(university.districtId)
        .then(setCities)
        .catch(console.error);
  }, [university, open]);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      let savedUniversity: University;
      if (isEditing) {
        savedUniversity = await updateUniversity(
          university!.universityId,
          data,
          university!,
        );
      } else {
        savedUniversity = await createUniversity(
          data as Omit<University, "universityId">,
        );
      }

      const file = fileRef.current?.files?.[0];
      if (file) {
        await uploadUniversityLogo(
          savedUniversity.universityId,
          savedUniversity.universityCode,
          file,
        );
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      setSubmitError(
        err instanceof Error ? err.message : "Failed to save university",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-base font-semibold leading-none text-[hsl(var(--primary))]">
            {isEditing ? "Edit University" : "Add University"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-2 py-1">
          <div className="grid grid-cols-2 gap-2">
            <FormField
              label="University Name"
              required
              htmlFor="universityName"
              error={errors.universityName?.message}
            >
              <Input
                id="universityName"
                {...register("universityName")}
                placeholder="e.g. ABC University"
              />
            </FormField>
            <FormField
              label="University Code"
              required
              htmlFor="universityCode"
              error={errors.universityCode?.message}
            >
              <Input
                id="universityCode"
                {...register("universityCode")}
                placeholder="e.g. ABCU"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FormField label="Short Name" htmlFor="universityShortName">
              <Input
                id="universityShortName"
                {...register("universityShortName")}
                placeholder="e.g. ABC"
              />
            </FormField>
            <FormField label="Print Prefix" htmlFor="printPrefix">
              <Input
                id="printPrefix"
                {...register("printPrefix")}
                placeholder="e.g. UNIV"
              />
            </FormField>
          </div>

          <FormField label="Logo">
            <div className="flex items-center gap-3">
              <img
                src={logoPreview ?? noImgLogo.src}
                alt="preview"
                className="h-14 w-14 rounded object-contain border"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = noImgLogo.src;
                }}
              />
              <Input
                type="file"
                accept=".png,.jpg,.jpeg"
                ref={fileRef}
                onChange={handleLogoChange}
                className="max-w-xs"
              />
            </div>
            <p className="text-xs text-slate-400">
              Accepted: .png, .jpg, .jpeg
            </p>
          </FormField>

          <FormField
            label="Address"
            required
            htmlFor="address"
            error={errors.address?.message}
          >
            <Input
              id="address"
              {...register("address")}
              placeholder="Full address"
            />
          </FormField>

          <div className="grid grid-cols-2 gap-2">
            <Controller
              name="countryId"
              control={control}
              render={({ field }) => (
                <Select
                  label="Country"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined);
                    setValue("stateId", undefined);
                    setValue("districtId", undefined as unknown as number);
                    setValue("cityId", undefined as unknown as number);
                  }}
                  options={countryOptions}
                  placeholder="Select country"
                  searchable
                />
              )}
            />
            <Controller
              name="stateId"
              control={control}
              render={({ field }) => (
                <Select
                  label="State"
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined);
                    setValue("districtId", undefined as unknown as number);
                    setValue("cityId", undefined as unknown as number);
                  }}
                  options={stateOptions}
                  placeholder="Select state"
                  searchable
                  disabled={!countryId}
                />
              )}
            />
            <Controller
              name="districtId"
              control={control}
              render={({ field }) => (
                <Select
                  label="District"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => {
                    field.onChange(v ? Number(v) : undefined);
                    setValue("cityId", undefined as unknown as number);
                  }}
                  options={districtOptions}
                  placeholder="Select district"
                  searchable
                  disabled={!stateId}
                  error={errors.districtId?.message}
                />
              )}
            />
            <Controller
              name="cityId"
              control={control}
              render={({ field }) => (
                <Select
                  label="City"
                  required
                  value={field.value ? String(field.value) : null}
                  onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                  options={cityOptions}
                  placeholder="Select city"
                  searchable
                  disabled={!districtId}
                  error={errors.cityId?.message}
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FormField
              label="Mandal"
              required
              htmlFor="mandal"
              error={errors.mandal?.message}
            >
              <Input
                id="mandal"
                {...register("mandal")}
                placeholder="e.g. Kukatpally"
              />
            </FormField>
            <FormField
              label="Pin Code"
              required
              htmlFor="pinCode"
              error={errors.pinCode?.message}
            >
              <Input
                id="pinCode"
                {...register("pinCode")}
                placeholder="6-digit pin code"
              />
            </FormField>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <FormField
              label="Mobile No"
              htmlFor="mobileNumber"
              error={errors.mobileNumber?.message}
            >
              <Input
                id="mobileNumber"
                {...register("mobileNumber")}
                placeholder="10-digit number"
              />
            </FormField>
            <FormField label="Landline No" htmlFor="landlineNumber">
              <Input
                id="landlineNumber"
                {...register("landlineNumber")}
                placeholder="Landline number"
              />
            </FormField>
            <FormField
              label="Email"
              htmlFor="email"
              error={errors.email?.message}
            >
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="university@example.com"
              />
            </FormField>
            <FormField label="Fax" htmlFor="fax">
              <Input id="fax" {...register("fax")} placeholder="Fax number" />
            </FormField>
          </div>

          {isEditing && (
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <ActiveStatusField
                  isActive={field.value}
                  reason={watch("reason") ?? ""}
                  onActiveChange={field.onChange}
                  onReasonChange={(value) => setValue("reason", value)}
                  reasonError={errors.reason?.message}
                />
              )}
            />
          )}

          {submitError && (
            <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">
              {submitError}
            </p>
          )}

          <DialogFooter className="pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
