"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { DatePicker } from "@/common/components/date-picker";
import { Select, type SelectOption } from "@/common/components/select";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  listAcademicYearsForCollege,
  listCollegesByOrganization,
  listHostelDetails,
  postHostelRoomAllocation,
  searchEmployeesForTransport,
  searchStudentsInCollege,
  toHostelApiDate,
} from "@/services";
import { toastError, toastSuccess } from "@/lib/toast";

const schema = z.object({
  allocationFor: z.enum(["student", "employee"]),
  collegeId: z.coerce.number().min(1, "College is required"),
  academicYearId: z.coerce.number().optional(),
  personId: z.coerce.number().min(1, "Select a student or employee"),
  fromDate: z.date(),
  toDate: z.date(),
  paymentDueDate: z.date(),
  isAmountSetteled: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

export default function AllocateToRoomPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const hostelId = Number(searchParams.get("hostelId") ?? 0);
  const hstlRoomId = Number(searchParams.get("hstlRoomId") ?? 0);
  const hostelName = searchParams.get("hostelName") ?? "";
  const hostelCode = searchParams.get("hostelCode") ?? "";
  const floorNo = searchParams.get("floorNo") ?? "";
  const floorName = searchParams.get("floorName") ?? "";
  const roomNumber = searchParams.get("roomNumber") ?? "";
  const roomTypeCode = searchParams.get("roomTypeCode") ?? "";
  const availableBeds = searchParams.get("availableBeds") ?? "";
  const amount = searchParams.get("amount") ?? "";

  const [organizationId, setOrganizationId] = useState(0);
  const [colleges, setColleges] = useState<SelectOption[]>([]);
  const [academicYears, setAcademicYears] = useState<SelectOption[]>([]);
  const [personOptions, setPersonOptions] = useState<SelectOption[]>([]);
  const [searchingPerson, setSearchingPerson] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      allocationFor: "student",
      fromDate: new Date(),
      toDate: new Date(),
      paymentDueDate: new Date(),
      isAmountSetteled: false,
    },
  });

  const allocationFor = watch("allocationFor");
  const collegeId = watch("collegeId");
  const personId = watch("personId");

  useEffect(() => {
    if (!hstlRoomId) {
      router.replace("/hostel/rooms-list");
    }
  }, [hstlRoomId, router]);

  useEffect(() => {
    if (!hostelId) return;
    void listHostelDetails()
      .then((rows) => {
        const hostel = rows.find((h) => h.hostelId === hostelId);
        if (hostel?.organizationId) setOrganizationId(hostel.organizationId);
      })
      .catch((err) => toastError(err, "Failed to load hostel"));
  }, [hostelId]);

  useEffect(() => {
    if (!organizationId) {
      setColleges([]);
      return;
    }
    void listCollegesByOrganization(organizationId)
      .then((rows) =>
        setColleges(
          rows.map((c) => ({
            value: String((c as { collegeId?: number }).collegeId),
            label: String(
              (c as { collegeCode?: string }).collegeCode ??
                (c as { collegeName?: string }).collegeName,
            ),
          })),
        ),
      )
      .catch((err) => toastError(err, "Failed to load colleges"));
  }, [organizationId]);

  useEffect(() => {
    if (!collegeId || allocationFor !== "student") {
      setAcademicYears([]);
      return;
    }
    void listAcademicYearsForCollege(collegeId)
      .then((rows) =>
        setAcademicYears(
          rows.map((y) => ({
            value: String((y as { academicYearId?: number }).academicYearId),
            label: String(
              (y as { academicYear?: string }).academicYear ??
                (y as { academicYearId?: number }).academicYearId,
            ),
          })),
        ),
      )
      .catch((err) => toastError(err, "Failed to load academic years"));
  }, [collegeId, allocationFor]);

  async function searchPerson(term: string) {
    const q = term.trim();
    if (q.length < 5 || !collegeId) {
      setPersonOptions([]);
      return;
    }
    setSearchingPerson(true);
    try {
      const rows =
        allocationFor === "student"
          ? await searchStudentsInCollege(collegeId, q)
          : await searchEmployeesForTransport(q);
      setPersonOptions(
        rows.map((r) => {
          const row = r as {
            studentId?: number;
            employeeId?: number;
            firstName?: string;
            rollNumber?: string;
            empNumber?: string;
          };
          const id =
            allocationFor === "student" ? row.studentId : row.employeeId;
          const name = row.firstName ?? String(id);
          const sub = row.rollNumber ?? row.empNumber;
          return { value: String(id), label: sub ? `${name} (${sub})` : name };
        }),
      );
    } catch (err) {
      toastError(err, "Search failed");
    } finally {
      setSearchingPerson(false);
    }
  }

  async function onSubmit(data: FormValues) {
    if (!organizationId || !hostelId || !hstlRoomId) {
      toastError(new Error("Missing hostel or room"), "Cannot save");
      return;
    }
    const payload: Record<string, unknown> = {
      organizationId,
      collegeId: data.collegeId,
      hostelId,
      hstlRoomId,
      fromDate: toHostelApiDate(data.fromDate),
      toDate: toHostelApiDate(data.toDate),
      paymentDueDate: toHostelApiDate(data.paymentDueDate),
      isAmountSetteled: data.isAmountSetteled,
      isActive: true,
    };
    if (data.allocationFor === "student") {
      payload.studentId = data.personId;
      if (data.academicYearId) payload.academicYearId = data.academicYearId;
    } else {
      payload.employeeId = data.personId;
    }
    try {
      await postHostelRoomAllocation(payload);
      toastSuccess("Room allocated successfully");
      router.push("/hostel/view-room-details");
    } catch (err) {
      toastError(err, "Failed to allocate room");
    }
  }

  if (!hstlRoomId) {
    return null;
  }

  const floorLabel = floorName ? `${floorNo} (${floorName})` : floorNo;

  return (
    <FilteredListPage
      title="Hostel Room Allocation"
      filtersCollapsible={false}
      filters={
        <div className="rounded-sm border border-cyan-300 bg-cyan-50/20 px-3 py-2">
          <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2 lg:grid-cols-4">
            <p className="sm:col-span-2 lg:col-span-4">
              <span className="text-muted-foreground">Hostel : </span>
              <span>
                {hostelCode || hostelName
                  ? `${hostelCode} ${hostelName}`.trim()
                  : "—"}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Floor : </span>
              <span>{floorLabel || "—"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Room : </span>
              <span>
                {roomNumber}
                {roomTypeCode ? ` (${roomTypeCode})` : ""}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Available Beds : </span>
              <span>{availableBeds || "0"}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Amount : </span>
              <span>{amount || "—"}</span>
            </p>
          </div>
        </div>
      }
      body={
        <div>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void handleSubmit(onSubmit)();
            }}
          >
            <RadioGroup
              value={allocationFor}
              className="flex flex-wrap gap-x-12 gap-y-2"
              onValueChange={(value) => {
                setValue("allocationFor", value as FormValues["allocationFor"]);
                setValue("personId", undefined as unknown as number);
                setPersonOptions([]);
              }}
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem id="allocation-student" value="student" />
                <Label htmlFor="allocation-student" className="font-normal">
                  Allocate Student
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem id="allocation-employee" value="employee" />
                <Label htmlFor="allocation-employee" className="font-normal">
                  Allocate Employee
                </Label>
              </div>
            </RadioGroup>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[145px_145px_minmax(280px,430px)]">
              <Controller
                name="collegeId"
                control={control}
                render={({ field }) => (
                  <Select
                    label="College *"
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => {
                      field.onChange(v ? Number(v) : undefined);
                      setValue("personId", undefined as unknown as number);
                      setPersonOptions([]);
                    }}
                    options={colleges}
                    searchable
                    error={errors.collegeId?.message}
                  />
                )}
              />
              {allocationFor === "student" && (
                <Controller
                  name="academicYearId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      label="Academic year"
                      value={field.value ? String(field.value) : null}
                      onChange={(v) =>
                        field.onChange(v ? Number(v) : undefined)
                      }
                      options={academicYears}
                      searchable
                      error={errors.academicYearId?.message}
                    />
                  )}
                />
              )}
              <Controller
                name="personId"
                control={control}
                render={({ field }) => (
                  <Select
                    label={allocationFor === "student" ? "Student" : "Employee"}
                    value={field.value ? String(field.value) : null}
                    onChange={(v) => field.onChange(v ? Number(v) : undefined)}
                    options={personOptions}
                    searchable
                    onSearch={(term) => void searchPerson(term)}
                    isLoading={searchingPerson}
                    disabled={!collegeId}
                    placeholder={
                      allocationFor === "student" ? "Student" : "Employee"
                    }
                    error={errors.personId?.message}
                  />
                )}
              />
            </div>

            {personId ? (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <Controller
                    name="fromDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label="From date"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="toDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label="To date"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                  <Controller
                    name="paymentDueDate"
                    control={control}
                    render={({ field }) => (
                      <DatePicker
                        label="Payment due date"
                        value={field.value}
                        onChange={field.onChange}
                      />
                    )}
                  />
                </div>

                <Controller
                  name="isAmountSetteled"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="isAmountSetteled"
                        checked={field.value}
                        onCheckedChange={(v) => field.onChange(v === true)}
                      />
                      <Label
                        htmlFor="isAmountSetteled"
                        className="text-sm font-normal"
                      >
                        Amount settled
                      </Label>
                    </div>
                  )}
                />

                <Button type="submit" disabled={isSubmitting}>
                  Save details
                </Button>
              </>
            ) : null}
          </form>
        </div>
      }
    >
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          className="h-9 min-w-28 border border-amber-500 bg-amber-400 text-slate-900 shadow-sm hover:bg-amber-500"
          onClick={() =>
            router.push(
              hostelId
                ? `/hostel/rooms-list?hostelId=${hostelId}`
                : "/hostel/rooms-list",
            )
          }
        >
          Back
        </Button>
      </div>
    </FilteredListPage>
  );
}
