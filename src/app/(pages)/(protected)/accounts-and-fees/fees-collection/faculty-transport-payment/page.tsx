"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  toEmployeeSearchSelectOptions,
} from "@/common/components/select";
import { FilteredPage } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { QK } from "@/lib/query-keys";
import { toastError } from "@/lib/toast";
import { formatTransportTime } from "../_lib/pay-fees-mode";
import {
  getEmployeeDetailsForTransport,
  listTransportAllocationsByEmployee,
  searchEmployeesForTransport,
} from "@/services";
import type {
  EmployeeProfileRow,
  EmployeeSearchRow,
  TransportAllocationRow,
} from "@/types/fees-collection";

const DEFAULT_PHOTO = "/assets/images/avatars/default_Student.png";

function isEmptyObject(obj: object | null | undefined): boolean {
  return !obj || Object.keys(obj).length === 0;
}

function FacultyTransportPaymentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedQueryKey = useRef<string | null>(null);

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<EmployeeSearchRow[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedHit, setSelectedHit] = useState<EmployeeSearchRow | null>(
    null,
  );

  const onEmployeeSearch = useCallback((term: string) => {
    const q = term.trim();
    if (q.length < 5) {
      setEmployees([]);
      return;
    }
    setSearchLoading(true);
    void searchEmployeesForTransport(q)
      .then((rows) => setEmployees(Array.isArray(rows) ? rows : []))
      .catch((e) => {
        toastError(e, "Employee search failed");
        setEmployees([]);
      })
      .finally(() => setSearchLoading(false));
  }, []);

  // Angular queryParams restore: empName + employeeId
  useEffect(() => {
    const empName = searchParams.get("empName")?.trim() ?? "";
    const empId = searchParams.get("employeeId")?.trim() ?? "";
    if (!empName && !empId) return;

    const key = searchParams.toString();
    if (appliedQueryKey.current === key) return;
    appliedQueryKey.current = key;

    if (empId) setEmployeeId(empId);

    const q = empName.length >= 5 ? empName : empName.length > 0 ? empName : "";
    if (!q || q.length < 5) {
      if (empId) setEmployeeId(empId);
      return;
    }

    setSearchLoading(true);
    void searchEmployeesForTransport(q)
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : [];
        setEmployees(list);
        if (empId) {
          setEmployeeId(empId);
          const hit = list.find((r) => String(r.employeeId) === empId) ?? null;
          setSelectedHit(hit);
        }
      })
      .catch((e) => toastError(e, "Employee search failed"))
      .finally(() => setSearchLoading(false));
  }, [searchParams]);

  const selectedEmployeeId = Number(employeeId ?? 0);

  const detailsQuery = useQuery({
    queryKey: QK.feesCollection.employeeDetails(selectedEmployeeId),
    queryFn: () => getEmployeeDetailsForTransport(selectedEmployeeId),
    enabled: selectedEmployeeId > 0,
  });

  const employeeDetails: EmployeeProfileRow | null = detailsQuery.data ?? null;

  const allocationsQuery = useQuery({
    queryKey: QK.feesCollection.transportAllocations(selectedEmployeeId),
    queryFn: () => listTransportAllocationsByEmployee(selectedEmployeeId),
    enabled:
      selectedEmployeeId > 0 &&
      !!employeeDetails &&
      !isEmptyObject(employeeDetails),
  });

  useEffect(() => {
    if (detailsQuery.isError) {
      toastError(detailsQuery.error, "Failed to load employee details");
    }
  }, [detailsQuery.isError, detailsQuery.error]);

  useEffect(() => {
    if (allocationsQuery.isError) {
      toastError(allocationsQuery.error, "Failed to load transport details");
    }
  }, [allocationsQuery.isError, allocationsQuery.error]);

  const transportRows: TransportAllocationRow[] = allocationsQuery.data ?? [];

  const employeeOptions = useMemo(() => {
    const byId = new Map<string, EmployeeSearchRow>();
    for (const emp of employees) {
      if (emp.employeeId) byId.set(String(emp.employeeId), emp);
    }
    if (selectedHit?.employeeId) {
      byId.set(String(selectedHit.employeeId), selectedHit);
    }
    return toEmployeeSearchSelectOptions(Array.from(byId.values()), {
      layout: "number-first",
    });
  }, [employees, selectedHit]);

  function onSelectEmployee(id: string | null) {
    setEmployeeId(id);
    if (!id) {
      setSelectedHit(null);
      return;
    }
    const hit =
      employees.find((e) => String(e.employeeId) === id) ?? selectedHit ?? null;
    setSelectedHit(hit);
  }

  function payFee(row: TransportAllocationRow) {
    if (!employeeDetails) return;
    const qs = new URLSearchParams({
      collegeId: String(employeeDetails.collegeId ?? ""),
      employeeId: String(row.employeeId ?? selectedEmployeeId),
      firstName: String(employeeDetails.firstName ?? ""),
      empNumber: String(employeeDetails.empNumber ?? ""),
      routePickupPlace: String(row.routePickupPlace ?? ""),
      dropTime: String(row.dropTime ?? ""),
      pickTime: String(row.pickTime ?? ""),
      routeDropPlace: String(row.routeDropPlace ?? ""),
      routeCode: String(row.routeCode ?? ""),
      collegeCode: String(employeeDetails.collegeCode ?? ""),
      photoPath: String(employeeDetails.photoPath ?? ""),
      deptName: String(employeeDetails.deptName ?? ""),
      mobile: String(employeeDetails.mobile ?? ""),
      academicYearId: String(row.academicYearId ?? ""),
      academicYear: String(row.academicYear ?? ""),
      transportAllocationId: String(row.transportAllocationId ?? ""),
    });
    router.push(
      `/accounts-and-fees/fees-collection/faculty-transport-payment/faculty-fee-pay?${qs.toString()}`,
    );
  }

  const showProfile = !!employeeDetails && !isEmptyObject(employeeDetails);

  return (
    <FilteredPage
      title="Faculty Bus Fee Collection"
      filtersCollapsible={false}
      filters={
        <div className="max-w-xl">
          <Select
            label="Employee"
            required
            value={employeeId}
            onChange={onSelectEmployee}
            options={employeeOptions}
            placeholder="Search by employee name or number."
            searchable
            onSearch={onEmployeeSearch}
            isLoading={searchLoading}
            clearable
          />
        </div>
      }
      body={
        showProfile ? (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-sm border bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={employeeDetails.photoPath || DEFAULT_PHOTO}
                  alt=""
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    const img = e.currentTarget;
                    if (!img.src.endsWith("default_Student.png")) {
                      img.src = DEFAULT_PHOTO;
                    }
                  }}
                />
              </div>
              <div className="space-y-0.5 text-sm">
                <p className="font-medium text-slate-900">
                  {employeeDetails.firstName}
                </p>
                <p className="text-blue-700">{employeeDetails.empNumber}</p>
                <p className="text-muted-foreground">
                  {[employeeDetails.collegeCode, employeeDetails.deptName]
                    .filter(Boolean)
                    .join(" / ")}
                </p>
                <p className="text-muted-foreground">
                  {employeeDetails.mobile}
                </p>
              </div>
            </div>

            {transportRows.length === 0 ? (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                To pay transport fee please allocate route to staff.
              </p>
            ) : null}

            <div>
              <h2 className="mb-2 text-sm font-semibold">Transport Details</h2>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b bg-slate-50 text-left">
                      <th className="px-2 py-2">SI No.</th>
                      <th className="px-2 py-2">Route</th>
                      <th className="px-2 py-2">Academic Year</th>
                      <th className="px-2 py-2">Pickup Point</th>
                      <th className="px-2 py-2">Drop Point</th>
                      <th className="px-2 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transportRows.map((row, i) => (
                      <tr
                        key={String(
                          row.transportAllocationId ?? `${row.routeCode}-${i}`,
                        )}
                        className="border-b"
                      >
                        <td className="px-2 py-2">{i + 1}</td>
                        <td className="px-2 py-2">
                          {row.routePickupPlace} - {row.routeDropPlace} (
                          <span className="font-medium text-blue-700">
                            {row.routeCode}
                          </span>
                          )
                        </td>
                        <td className="px-2 py-2">{row.academicYear}</td>
                        <td className="px-2 py-2">
                          {row.pickupRouteStopName} (
                          <span className="font-medium text-blue-700">
                            {formatTransportTime(row.pickTime)}
                          </span>
                          )
                        </td>
                        <td className="px-2 py-2">
                          {row.dropRoutestopName} (
                          <span className="font-medium text-blue-700">
                            {formatTransportTime(row.dropTime)}
                          </span>
                          )
                        </td>
                        <td className="px-2 py-2">
                          <Button
                            type="button"
                            size="sm"
                            className="h-[30px] bg-[#ffcf46] px-4 text-[12px] font-medium text-slate-900 hover:bg-[#e5b535]"
                            onClick={() => payFee(row)}
                          >
                            Payment
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {transportRows.length === 0 &&
                    !allocationsQuery.isLoading ? (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-2 py-4 text-center text-muted-foreground"
                        >
                          No transport allocations found.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : null
      }
      tableHeader={
        showProfile ? (
          <div className="table-context-header">
            <span
              className="material-icons table-context-header__icon"
              aria-hidden
            >
              computer
            </span>
            <strong className="table-context-header__title">
              Transport Details
            </strong>
          </div>
        ) : null
      }
    />
  );
}

export default function FacultyTransportPaymentPage() {
  return (
    <Suspense fallback={null}>
      <FacultyTransportPaymentContent />
    </Suspense>
  );
}
