"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Controller, useForm, type Resolver } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { StatusBadge } from "@/common/components/data-display";
import { Select, type SelectOption } from "@/common/components/select";
import { formatDate } from "@/common/generic-functions";
import { FilteredListPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  allocateTransportForStudent,
  listAcademicYearsForCollege,
  listCollegesByOrganization,
  listRouteStopsByRoute,
  listRoutesByTransportDetail,
  listTransportAllocationForStudent,
  listTransportAllocations,
  searchEmployeesForTransport,
  searchStudentsInCollege,
} from "@/services";
import type {
  RouteStop,
  TransportAllocation,
  TransportAllocationFor,
} from "@/types/transport";
import { useTransportOrgCascade } from "../_lib/use-transport-org-cascade";
import { formatTransportTime, toApiDate } from "../_lib/format-transport-time";
import {
  DEFAULT_TRANSPORT_PASSPORT_PHOTO,
  resolveTransportPhotoSrc,
} from "../_lib/transport-photo";
import { toastError, toastSuccess } from "@/lib/toast";

type PersonRow = Record<string, unknown> & {
  studentId?: number;
  employeeId?: number;
  firstName?: string;
  stdFirstName?: string;
  rollNumber?: string;
  rollNo?: string;
  empNumber?: string;
  collegeId?: number;
  academicYearId?: number;
  collegeCode?: string;
  courseCode?: string;
  groupCode?: string;
  courseYearName?: string;
  section?: string;
  empDeptName?: string;
  designation?: string;
  mobile?: string;
  mobileNumber?: string;
  studentPhotoPath?: string;
  photoPath?: string;
};

type AllocationRow = TransportAllocation & {
  distanceFromSchoolKm?: number;
  pickTime?: string;
  dropTime?: string;
};

const schema = z
  .object({
    allocationFor: z.enum(["S", "E"]),
    organizationId: z.coerce.number().min(1, "Organization is required"),
    collegeId: z.coerce.number().min(1, "College is required"),
    academicYearId: z.coerce.number().min(1, "Academic year is required"),
    transportDetailId: z.coerce.number().min(1, "Transport is required"),
    personId: z.coerce.number().min(1, "Select a student or employee"),
    routeId: z.coerce.number().min(1, "Route is required"),
    pickupRouteStopId: z.coerce.number().min(1, "Pickup point is required"),
    dropRouteStopId: z.coerce.number().min(1, "Drop point is required"),
    fromDate: z.date({ message: "From date is required" }),
    toDate: z.date({ message: "To date is required" }),
  })
  .refine((data) => data.toDate >= data.fromDate, {
    message: "To date must be on or after From date",
    path: ["toDate"],
  });

type FormValues = z.infer<typeof schema>;

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function textValue(value: unknown): string {
  return value == null ? "" : String(value);
}

export default function TransportAllocationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [personOptions, setPersonOptions] = useState<SelectOption[]>([]);
  const [personRows, setPersonRows] = useState<PersonRow[]>([]);
  const [selectedPerson, setSelectedPerson] = useState<PersonRow | null>(null);
  const [searchingPerson, setSearchingPerson] = useState(false);
  const [loadingAllocation, setLoadingAllocation] = useState(false);
  const [colleges, setColleges] = useState<SelectOption[]>([]);
  const [academicYears, setAcademicYears] = useState<SelectOption[]>([]);
  const [routes, setRoutes] = useState<SelectOption[]>([]);
  const [routeStops, setRouteStops] = useState<RouteStop[]>([]);
  const [allocations, setAllocations] = useState<AllocationRow[]>([]);
  const [currentAllocationId, setCurrentAllocationId] = useState<
    number | undefined
  >();

  const {
    control,
    handleSubmit,
    watch,
    setValue,
    resetField,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: {
      allocationFor: "S",
      fromDate: new Date(),
      toDate: new Date(),
    },
  });

  const allocationFor = watch("allocationFor");
  const organizationId = watch("organizationId");
  const collegeId = watch("collegeId");
  const academicYearId = watch("academicYearId");
  const transportDetailId = watch("transportDetailId");
  const routeId = watch("routeId");
  const pickupRouteStopId = watch("pickupRouteStopId");
  const fromDate = watch("fromDate");

  const { transportDetails, loadingTransport } =
    useTransportOrgCascade(organizationId);

  const pickupOptions = useMemo<SelectOption[]>(
    () =>
      routeStops.map((stop) => ({
        value: String(stop.routeStopId),
        label: `${stop.stopName ?? stop.routeStopId} (${formatTransportTime(stop.pickTime)})`,
      })),
    [routeStops],
  );

  const dropOptions = useMemo<SelectOption[]>(() => {
    const selected = routeStops.find(
      (stop) => Number(stop.routeStopId) === Number(pickupRouteStopId),
    );
    return selected
      ? [
          {
            value: String(selected.routeStopId),
            label: `${selected.stopName ?? selected.routeStopId} (${formatTransportTime(selected.dropTime)})`,
          },
        ]
      : [];
  }, [pickupRouteStopId, routeStops]);

  function clearTraveller() {
    setPersonOptions([]);
    setPersonRows([]);
    setSelectedPerson(null);
    setAllocations([]);
    setCurrentAllocationId(undefined);
    setRoutes([]);
    setRouteStops([]);
    resetField("personId");
    resetField("transportDetailId");
    resetField("routeId");
    resetField("pickupRouteStopId");
    resetField("dropRouteStopId");
    setValue("fromDate", new Date());
    setValue("toDate", new Date());
  }

  useEffect(() => {
    const forType: TransportAllocationFor =
      searchParams.get("check") === "2" ? "E" : "S";
    setValue("allocationFor", forType);
    const storedOrganizationId = numberValue(
      globalThis.localStorage?.getItem("organizationId"),
    );
    if (storedOrganizationId) setValue("organizationId", storedOrganizationId);
  }, [searchParams, setValue]);

  useEffect(() => {
    if (!organizationId) {
      setColleges([]);
      return;
    }
    void listCollegesByOrganization(organizationId)
      .then((rows) => {
        const options = rows
          .map((college) => ({
            value: String(
              numberValue((college as { collegeId?: number }).collegeId),
            ),
            label: textValue(
              (college as { collegeCode?: string }).collegeCode ??
                (college as { collegeName?: string }).collegeName,
            ),
          }))
          .filter((option) => option.value !== "0");
        setColleges(options);
        const storedCollegeId = globalThis.localStorage?.getItem("collegeId");
        const preferred =
          options.find((option) => option.value === storedCollegeId) ??
          options[0];
        if (preferred && !collegeId)
          setValue("collegeId", Number(preferred.value));
      })
      .catch((err) => toastError(err, "Failed to load colleges"));
  }, [collegeId, organizationId, setValue]);

  useEffect(() => {
    if (!collegeId) {
      setAcademicYears([]);
      return;
    }
    void listAcademicYearsForCollege(collegeId)
      .then((rows) => {
        const options = rows
          .map((year) => ({
            value: String(
              numberValue((year as { academicYearId?: number }).academicYearId),
            ),
            label: textValue(
              (year as { academicYear?: string }).academicYear ??
                (year as { academicYearId?: number }).academicYearId,
            ),
          }))
          .filter((option) => option.value !== "0");
        setAcademicYears(options);
        const storedAcademicYearId =
          globalThis.localStorage?.getItem("academicYearId");
        const preferred =
          options.find((option) => option.value === storedAcademicYearId) ??
          options[0];
        if (preferred && !academicYearId)
          setValue("academicYearId", Number(preferred.value));
      })
      .catch((err) => toastError(err, "Failed to load academic years"));
  }, [academicYearId, collegeId, setValue]);

  useEffect(() => {
    if (!transportDetailId) {
      setRoutes([]);
      return;
    }
    void listRoutesByTransportDetail(transportDetailId)
      .then((rows) =>
        setRoutes(
          rows.map((route) => ({
            value: String(route.routeId),
            label:
              `${route.routePickupPlace ?? ""} - ${route.routeDropPlace ?? ""}`.replace(
                /^ - $/,
                "",
              ) ||
              route.routeCode ||
              String(route.routeId),
          })),
        ),
      )
      .catch((err) => toastError(err, "Failed to load routes"));
  }, [transportDetailId]);

  useEffect(() => {
    if (!routeId) {
      setRouteStops([]);
      return;
    }
    void listRouteStopsByRoute(routeId)
      .then(setRouteStops)
      .catch((err) => toastError(err, "Failed to load route stops"));
  }, [routeId]);

  async function searchPerson(term: string) {
    if (term.trim().length < 5) {
      setPersonOptions([]);
      setPersonRows([]);
      return;
    }
    setSearchingPerson(true);
    try {
      const result =
        allocationFor === "S"
          ? await searchStudentsInCollege(collegeId, term, {
              includeActive: false,
            })
          : await searchEmployeesForTransport(term, collegeId);
      const rows = (result as PersonRow[]).filter((row) => {
        const rowCollegeId = numberValue(row.collegeId);
        return !collegeId || !rowCollegeId || rowCollegeId === collegeId;
      });
      setPersonRows(rows);
      setPersonOptions(
        rows
          .map((row) => {
            const id = allocationFor === "S" ? row.studentId : row.employeeId;
            const name = row.firstName ?? row.stdFirstName ?? String(id);
            const number =
              allocationFor === "S"
                ? (row.rollNumber ?? row.rollNo)
                : row.empNumber;
            return {
              value: String(id),
              label: number ? `${number} (${name})` : name,
            };
          })
          .filter((option) => option.value !== "undefined"),
      );
    } catch (err) {
      toastError(err, "Search failed");
    } finally {
      setSearchingPerson(false);
    }
  }

  function applyCurrentAllocation(row: AllocationRow | undefined) {
    setCurrentAllocationId(row?.transportAllocationId);
    if (!row) {
      setValue("fromDate", new Date());
      setValue("toDate", new Date());
      return;
    }
    if (row.transportDetailId)
      setValue("transportDetailId", row.transportDetailId);
    if (row.routeId) setValue("routeId", row.routeId);
    if (row.pickupRouteStopId)
      setValue("pickupRouteStopId", row.pickupRouteStopId);
    if (row.dropRouteStopId) setValue("dropRouteStopId", row.dropRouteStopId);
    setValue("fromDate", row.fromDate ? new Date(row.fromDate) : new Date());
    setValue("toDate", row.toDate ? new Date(row.toDate) : new Date());
  }

  async function loadPersonAllocations(person: PersonRow) {
    const personId = numberValue(
      allocationFor === "S" ? person.studentId : person.employeeId,
    );
    if (!personId) return;
    setLoadingAllocation(true);
    try {
      const [historyResult, currentResult] = await Promise.allSettled([
        listTransportAllocations(allocationFor, personId),
        listTransportAllocationForStudent({
          ...(allocationFor === "S"
            ? { studentId: personId }
            : { employeeId: personId }),
          date: toApiDate(new Date()) ?? "",
        }),
      ]);
      if (historyResult.status === "rejected") throw historyResult.reason;
      const historyRows = historyResult.value;
      const currentRows =
        currentResult.status === "fulfilled" ? currentResult.value : [];
      const history = (historyRows as AllocationRow[]).sort(
        (a, b) =>
          numberValue(b.transportAllocationId) -
          numberValue(a.transportAllocationId),
      );
      setAllocations(history);
      applyCurrentAllocation(currentRows[0] as AllocationRow | undefined);
    } catch (err) {
      setAllocations([]);
      applyCurrentAllocation(undefined);
      toastError(err, "Failed to load transport details");
    } finally {
      setLoadingAllocation(false);
    }
  }

  function selectPerson(
    value: string | null,
    onChange: (value?: number) => void,
  ) {
    const personId = value ? Number(value) : undefined;
    onChange(personId);
    const person =
      personRows.find(
        (row) =>
          Number(allocationFor === "S" ? row.studentId : row.employeeId) ===
          personId,
      ) ?? null;
    setSelectedPerson(person);
    setAllocations([]);
    setCurrentAllocationId(undefined);
    resetField("transportDetailId");
    resetField("routeId");
    resetField("pickupRouteStopId");
    resetField("dropRouteStopId");
    setValue("fromDate", new Date());
    setValue("toDate", new Date());
    if (person) void loadPersonAllocations(person);
  }

  async function onSubmit(data: FormValues) {
    const selectedStop = routeStops.find(
      (stop) => Number(stop.routeStopId) === Number(data.pickupRouteStopId),
    );
    const amount = numberValue(selectedStop?.amount);
    const payload: Record<string, unknown> = {
      allocationFor: data.allocationFor,
      organizationId: data.organizationId,
      collegeId: data.collegeId,
      academicYearId: data.academicYearId,
      transportDetailId: data.transportDetailId,
      routeId: data.routeId,
      pickupRouteStopId: data.pickupRouteStopId,
      dropRouteStopId: data.dropRouteStopId,
      fromDate: toApiDate(data.fromDate),
      toDate: toApiDate(data.toDate),
      fromPayDate: toApiDate(data.fromDate),
      toPayDate: toApiDate(data.toDate),
      grossAmount: amount,
      balanceAmount: amount,
      netAmount: amount,
      discountAmount: 0,
      fineAmount: 0,
      paidAmount: 0,
      isActive: true,
    };
    if (currentAllocationId)
      payload.transportAllocationId = currentAllocationId;
    if (data.allocationFor === "S") payload.studentId = data.personId;
    else payload.employeeId = data.personId;

    try {
      await allocateTransportForStudent(payload);
      toastSuccess("Transport allocated successfully");
      if (selectedPerson) await loadPersonAllocations(selectedPerson);
    } catch (err) {
      toastError(err, "Failed to allocate transport");
    }
  }

  const personName =
    selectedPerson?.firstName ?? selectedPerson?.stdFirstName ?? "—";
  const personNumber =
    allocationFor === "S"
      ? (selectedPerson?.rollNumber ?? selectedPerson?.rollNo)
      : selectedPerson?.empNumber;
  const photo =
    allocationFor === "S"
      ? selectedPerson?.studentPhotoPath
      : selectedPerson?.photoPath;
  const personDetails =
    allocationFor === "S"
      ? [
          selectedPerson?.collegeCode,
          selectedPerson?.courseCode,
          selectedPerson?.groupCode,
          selectedPerson?.courseYearName,
          selectedPerson?.section ? `Section ${selectedPerson.section}` : "",
        ]
          .filter(Boolean)
          .join(" / ")
      : [selectedPerson?.empDeptName, selectedPerson?.designation]
          .filter(Boolean)
          .join(" / ");

  const searchFilters = (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
      <Controller
        name="collegeId"
        control={control}
        render={({ field }) => (
          <Select
            label="College *"
            value={field.value ? String(field.value) : null}
            onChange={(value) => {
              field.onChange(value ? Number(value) : undefined);
              resetField("academicYearId");
              clearTraveller();
            }}
            options={colleges}
            searchable
            disabled={!organizationId}
            error={errors.collegeId?.message}
          />
        )}
      />
      <Controller
        name="academicYearId"
        control={control}
        render={({ field }) => (
          <Select
            label="Academic Year *"
            value={field.value ? String(field.value) : null}
            onChange={(value) => {
              field.onChange(value ? Number(value) : undefined);
              clearTraveller();
            }}
            options={academicYears}
            searchable
            disabled={!collegeId}
            error={errors.academicYearId?.message}
          />
        )}
      />
      <Controller
        name="personId"
        control={control}
        render={({ field }) => (
          <Select
            label={allocationFor === "S" ? "Student *" : "Employee *"}
            value={field.value ? String(field.value) : null}
            onChange={(value) => selectPerson(value, field.onChange)}
            options={personOptions}
            placeholder="Type at least 5 characters to search"
            searchable
            onSearch={(term) => void searchPerson(term)}
            isLoading={searchingPerson}
            disabled={!collegeId || !academicYearId}
            error={errors.personId?.message}
          />
        )}
      />
    </div>
  );

  const allocationBody = selectedPerson ? (
    <div className="space-y-5">
      <div className="flex max-w-3xl flex-col gap-4 rounded-sm border-4 border-sky-200 bg-card p-3 sm:flex-row">
        <div className="h-28 w-28 shrink-0 overflow-hidden rounded-sm bg-sky-100 p-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={resolveTransportPhotoSrc(textValue(photo))}
            alt={personName}
            className="h-full w-full object-cover"
            onError={(event) => {
              const image = event.currentTarget;
              if (!image.src.includes("default_Student.png")) {
                image.src = DEFAULT_TRANSPORT_PASSPORT_PHOTO;
              }
            }}
          />
        </div>
        <div className="min-w-0 space-y-1 py-1">
          <p className="text-sm font-semibold text-foreground">{personName}</p>
          <p className="text-sm font-medium text-muted-foreground">
            {personNumber || "—"}
          </p>
          {personDetails ? (
            <p className="text-sm font-medium text-muted-foreground">
              {personDetails}
            </p>
          ) : null}
          <p className="text-sm font-medium text-muted-foreground">
            {selectedPerson.mobile ?? selectedPerson.mobileNumber ?? ""}
          </p>
        </div>
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSubmit(onSubmit)();
        }}
      >
        <h3 className="text-sm font-semibold">Transport Allocation</h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
          <Controller
            name="transportDetailId"
            control={control}
            render={({ field }) => (
              <Select
                label="Transport *"
                value={field.value ? String(field.value) : null}
                onChange={(value) => {
                  field.onChange(value ? Number(value) : undefined);
                  resetField("routeId");
                  resetField("pickupRouteStopId");
                  resetField("dropRouteStopId");
                }}
                options={transportDetails}
                searchable
                isLoading={loadingTransport || loadingAllocation}
                disabled={!organizationId}
                error={errors.transportDetailId?.message}
              />
            )}
          />
          <Controller
            name="routeId"
            control={control}
            render={({ field }) => (
              <Select
                label="Route *"
                value={field.value ? String(field.value) : null}
                onChange={(value) => {
                  field.onChange(value ? Number(value) : undefined);
                  resetField("pickupRouteStopId");
                  resetField("dropRouteStopId");
                }}
                options={routes}
                searchable
                disabled={!transportDetailId}
                error={errors.routeId?.message}
              />
            )}
          />
          <Controller
            name="pickupRouteStopId"
            control={control}
            render={({ field }) => (
              <Select
                label="Pick Up Point *"
                value={field.value ? String(field.value) : null}
                onChange={(value) => {
                  const id = value ? Number(value) : undefined;
                  field.onChange(id);
                  setValue("dropRouteStopId", id as number);
                }}
                options={pickupOptions}
                searchable
                disabled={!routeId}
                error={errors.pickupRouteStopId?.message}
              />
            )}
          />
          <Controller
            name="dropRouteStopId"
            control={control}
            render={({ field }) => (
              <Select
                label="Drop Point *"
                value={field.value ? String(field.value) : null}
                onChange={(value) =>
                  field.onChange(value ? Number(value) : undefined)
                }
                options={dropOptions}
                searchable
                disabled={!pickupRouteStopId}
                error={errors.dropRouteStopId?.message}
              />
            )}
          />
        </div>

        <div className="grid max-w-xl grid-cols-1 gap-3 md:grid-cols-2">
          <Controller
            name="fromDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="From Date *"
                required
                value={field.value ?? null}
                onChange={(value) => {
                  field.onChange(value);
                  const toDate = watch("toDate");
                  if (value && toDate && toDate < value)
                    setValue("toDate", value);
                }}
                clearable={false}
                error={errors.fromDate?.message}
              />
            )}
          />
          <Controller
            name="toDate"
            control={control}
            render={({ field }) => (
              <DatePicker
                label="To Date *"
                required
                value={field.value ?? null}
                onChange={field.onChange}
                minDate={fromDate}
                clearable={false}
                error={errors.toDate?.message}
              />
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting || loadingAllocation}>
          {isSubmitting ? "Saving…" : "Save Details"}
        </Button>
      </form>

      <div className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Transport Details</h3>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/50">
              <tr>
                {[
                  "Academic",
                  "Route",
                  "Pickup Place",
                  "Drop Place",
                  "Distance (KM)",
                  "Date",
                  "Status",
                ].map((label) => (
                  <th key={label} className="px-3 py-2 text-left font-semibold">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingAllocation ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    Loading transport details…
                  </td>
                </tr>
              ) : allocations.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-3 py-8 text-center text-muted-foreground"
                  >
                    No transport details found.
                  </td>
                </tr>
              ) : (
                allocations.map((row) => (
                  <tr key={row.transportAllocationId}>
                    <td className="px-3 py-2">{row.academicYear ?? "—"}</td>
                    <td className="px-3 py-2">{row.routeCode ?? "—"}</td>
                    <td className="px-3 py-2">
                      {row.pickupRouteStopName ?? "—"} (
                      {formatTransportTime(row.pickTime)})
                    </td>
                    <td className="px-3 py-2">
                      {row.dropRoutestopName ?? "—"} (
                      {formatTransportTime(row.dropTime)})
                    </td>
                    <td className="px-3 py-2">
                      {row.distanceFromSchoolKm ?? "—"}
                    </td>
                    <td className="px-3 py-2">
                      {formatDate(row.fromDate)} - {formatDate(row.toDate)}
                    </td>
                    <td className="px-3 py-2">
                      <StatusBadge status={row.isActive ?? false} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <FilteredListPage<AllocationRow>
      title="Transport Allocation"
      filters={searchFilters}
      filtersDefaultOpen
      notice={
        <RadioGroup
          value={allocationFor}
          onValueChange={(value) => {
            setValue("allocationFor", value === "E" ? "E" : "S");
            clearTraveller();
          }}
          className="flex items-center gap-6"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="S" id="allocate-student" />
            <label
              htmlFor="allocate-student"
              className="cursor-pointer text-sm"
            >
              Students List
            </label>
          </div>
          <div className="flex items-center gap-2">
            <RadioGroupItem value="E" id="allocate-employee" />
            <label
              htmlFor="allocate-employee"
              className="cursor-pointer text-sm"
            >
              Employee List
            </label>
          </div>
        </RadioGroup>
      }
      body={allocationBody}
      bodyClassName="border-t-0"
    >
      <Button
        type="button"
        variant="outline"
        onClick={() =>
          router.push(
            `/transport/transport-allocated-list?check=${allocationFor === "S" ? 1 : 2}`,
          )
        }
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>
    </FilteredListPage>
  );
}
