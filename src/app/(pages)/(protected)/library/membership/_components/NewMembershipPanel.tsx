"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { PlusIcon } from "lucide-react";
import { DatePicker } from "@/common/components/date-picker";
import { FormModal } from "@/common/components/feedback";
import { Select } from "@/common/components/select";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  createLibraryMembership,
  findLibraryMembershipForPerson,
  listLibrariesByCollege,
  searchEmployeesForLibraryMembership,
  searchStudentsForLibraryMembership,
  updateLibraryMembership,
} from "@/services";
import type {
  LibraryMembership,
  LibraryMembershipPayload,
} from "@/types/library";
import { toastError, toastSuccess } from "@/lib/toast";
import { DefaultMembershipListModal } from "./DefaultMembershipListModal";

type MemberKind = "S" | "E";
type PersonRow = LibraryMembership & Record<string, unknown>;

interface NewMembershipPanelProps {
  onSaved: () => void;
}

function personId(row: PersonRow, kind: MemberKind): number {
  return Number(kind === "S" ? row.studentId : row.employeeId);
}

function personNumber(row: PersonRow, kind: MemberKind): string {
  return String(kind === "S" ? (row.rollNumber ?? "") : (row.empNumber ?? ""));
}

export function NewMembershipPanel({
  onSaved,
}: Readonly<NewMembershipPanelProps>) {
  const [kind, setKind] = useState<MemberKind>("S");
  const [searchText, setSearchText] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<PersonRow | null>(null);
  const [libraryId, setLibraryId] = useState<string | null>(null);
  const [memberCode, setMemberCode] = useState("");
  const [maxBooks, setMaxBooks] = useState("");
  const [fromDate, setFromDate] = useState<Date | null>(new Date());
  const [toDate, setToDate] = useState<Date | null>(new Date());
  const [feePaid, setFeePaid] = useState(false);
  const [comments, setComments] = useState("");
  const [existing, setExisting] = useState<LibraryMembership | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [defaultListOpen, setDefaultListOpen] = useState(false);
  const [previewPayload, setPreviewPayload] =
    useState<LibraryMembershipPayload | null>(null);

  const term = searchText.trim();
  const peopleQuery = useQuery({
    queryKey: ["Library", "membership-person-search", kind, term],
    queryFn: () =>
      kind === "S"
        ? searchStudentsForLibraryMembership(term)
        : searchEmployeesForLibraryMembership(term),
    enabled: term.length >= 5,
  });

  const people = (peopleQuery.data ?? []) as PersonRow[];
  const personOptions = useMemo(
    () =>
      people
        .map((row) => {
          const id = personId(row, kind);
          if (!id) return null;
          const code = personNumber(row, kind);
          return {
            value: String(id),
            label: `${String(row.memberName ?? row.firstName ?? "")}${code ? ` (${code})` : ""}`,
          };
        })
        .filter(
          (option): option is { value: string; label: string } =>
            option != null,
        ),
    [kind, people],
  );

  const collegeId = Number(selected?.collegeId ?? 0);
  const librariesQuery = useQuery({
    queryKey: ["Library", "membership-libraries", collegeId],
    queryFn: () => listLibrariesByCollege(collegeId),
    enabled: collegeId > 0,
  });
  const libraryOptions = (librariesQuery.data ?? []).map((library) => ({
    value: String(library.libraryId),
    label: String(
      library.libraryCode ?? library.libraryName ?? library.libraryId,
    ),
  }));

  useEffect(() => {
    if (!selected) return;
    const id = personId(selected, kind);
    setMemberCode(personNumber(selected, kind));
    void findLibraryMembershipForPerson(id, kind)
      .then((membership) => {
        setExisting(membership);
        if (!membership) return;
        setLibraryId(
          membership.libraryId ? String(membership.libraryId) : null,
        );
        setMemberCode(
          String(
            membership.memberCode ??
              membership.membershipNo ??
              personNumber(selected, kind),
          ),
        );
        setMaxBooks(String(membership.noOfMaxBooks ?? ""));
        setFromDate(
          membership.memberFromDt
            ? new Date(membership.memberFromDt)
            : new Date(),
        );
        setToDate(
          membership.memberToDt ? new Date(membership.memberToDt) : new Date(),
        );
        setFeePaid(Boolean(membership.isFeepaid));
        setComments(String(membership.comments ?? ""));
      })
      .catch((error) => toastError(error, "Failed to load membership details"));
  }, [kind, selected]);

  function clearSelection(nextKind = kind) {
    setKind(nextKind);
    setSearchText("");
    setSelectedId(null);
    setSelected(null);
    setExisting(null);
    setLibraryId(null);
    setMemberCode("");
    setMaxBooks("");
    setFromDate(new Date());
    setToDate(new Date());
    setFeePaid(false);
    setComments("");
  }

  async function saveMembership() {
    if (!selected) {
      toastError(`Select a ${kind === "S" ? "student" : "employee"}.`);
      return;
    }
    if (!libraryId) {
      toastError("Library is required.");
      return;
    }
    if (!memberCode.trim()) {
      toastError("Membership Id is required.");
      return;
    }
    if (!Number(maxBooks) || Number(maxBooks) < 1) {
      toastError("Maximum number of books is required.");
      return;
    }
    if (!fromDate || !toDate) {
      toastError("Membership dates are required.");
      return;
    }
    if (fromDate > toDate) {
      toastError("From date should be before or equal to To date.");
      return;
    }

    const id = personId(selected, kind);
    const payload = {
      organizationId: Number(
        globalThis.localStorage?.getItem("organizationId") ?? 0,
      ),
      libraryId: Number(libraryId),
      memberCode: memberCode.trim(),
      noOfMaxBooks: Number(maxBooks),
      noOfBorrowedBooks: 0,
      memberFromDt: format(fromDate, "yyyy-MM-dd"),
      memberToDt: format(toDate, "yyyy-MM-dd"),
      isFeepaid: feePaid,
      isActive: existing?.isActive ?? false,
      comments: comments.trim(),
      membertype: kind,
      studentId: kind === "S" ? id : undefined,
      employeeId: kind === "E" ? id : undefined,
      student: kind === "S" ? [selected] : null,
      employee: kind === "E" ? [selected] : null,
      memberBarcode: existing?.memberBarcode ?? null,
    };

    setPreviewPayload(payload);
  }

  async function persistMembership() {
    if (!previewPayload) return;
    setSubmitting(true);
    try {
      const existingId = Number(
        existing?.libMemberId ?? existing?.memberShipId ?? 0,
      );
      if (existingId) {
        await updateLibraryMembership(existingId, {
          ...previewPayload,
          libMemberId: existingId,
        });
        toastSuccess("Membership updated successfully");
      } else {
        await createLibraryMembership(previewPayload);
        toastSuccess("Membership created successfully");
      }
      setPreviewPayload(null);
      clearSelection();
      onSaved();
    } catch (error) {
      toastError(
        error,
        `Failed to ${existing ? "update" : "create"} membership`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  const photo = String(
    selected?.studentPhotoPath ??
      selected?.photoPath ??
      "/assets/images/avatars/default_Student.png",
  );

  return (
    <div className="space-y-4 pt-2">
      <RadioGroup
        value={kind}
        onValueChange={(value) => clearSelection(value as MemberKind)}
        className="flex flex-wrap gap-6"
      >
        <div className="flex items-center gap-2">
          <RadioGroupItem value="S" id="membership-student" />
          <Label htmlFor="membership-student">Search For Student</Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="E" id="membership-employee" />
          <Label htmlFor="membership-employee">Search For Employee</Label>
        </div>
      </RadioGroup>

      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="w-full md:max-w-[45%]">
          <Select
            value={selectedId}
            onChange={(value) => {
              setSelectedId(value);
              setSelected(
                people.find((row) => String(personId(row, kind)) === value) ??
                  null,
              );
            }}
            onSearch={(value) => {
              if (value) {
                setSearchText(value);
                setSelectedId(null);
                setSelected(null);
              }
            }}
            options={personOptions}
            placeholder={kind === "S" ? "Student" : "Employee"}
            isLoading={peopleQuery.isFetching}
            searchable
            clearable
          />
        </div>
        <div className="space-y-2 md:text-right">
          <Button
            type="button"
            size="sm"
            onClick={() => setDefaultListOpen(true)}
          >
            <PlusIcon className="mr-1 h-3.5 w-3.5" />
            Default Membership For All {kind === "S" ? "Students" : "Employees"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Default Creation of Membership For All{" "}
            {kind === "S" ? "Students" : "Employees"}
          </p>
        </div>
      </div>

      {selected ? (
        <>
          <div className="flex items-center gap-4 rounded-md border bg-muted/20 p-3">
            <img
              src={photo}
              alt=""
              className="h-20 w-20 rounded-full border object-cover"
              onError={(event) => {
                event.currentTarget.src =
                  "/assets/images/avatars/default_Student.png";
              }}
            />
            <div className="space-y-1 text-sm">
              <p className="font-medium">
                {String(selected.memberName ?? selected.firstName ?? "")}
              </p>
              <p className="text-muted-foreground">
                {personNumber(selected, kind)}
              </p>
              <p className="text-muted-foreground">
                {kind === "S"
                  ? [
                      selected.collegeCode,
                      selected.courseCode,
                      selected.groupCode,
                      selected.courseYearName,
                      selected.section,
                    ]
                      .filter(Boolean)
                      .join(" / ")
                  : String(selected.empDeptName ?? "")}
              </p>
              <p className="text-muted-foreground">
                {String(selected.mobile ?? "")}
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="Library"
              required
              value={libraryId}
              onChange={setLibraryId}
              options={libraryOptions}
              placeholder="Select library"
              isLoading={librariesQuery.isFetching}
            />
            <div className="space-y-1">
              <Label htmlFor="newMembershipCode">Membership Id</Label>
              <Input
                id="newMembershipCode"
                value={memberCode}
                onChange={(event) => setMemberCode(event.target.value)}
                placeholder="Enter membership id"
                disabled
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="newMembershipMaxBooks">Max no. of books</Label>
              <Input
                id="newMembershipMaxBooks"
                type="number"
                min={1}
                value={maxBooks}
                onChange={(event) => setMaxBooks(event.target.value)}
                placeholder="Enter maximum books"
              />
            </div>
            <DatePicker
              label="From Date"
              value={fromDate}
              onChange={setFromDate}
              placeholder="Select from date"
            />
            <DatePicker
              label="To Date"
              value={toDate}
              onChange={setToDate}
              minDate={fromDate ?? undefined}
              placeholder="Select to date"
            />
            <div className="flex items-center gap-2 pt-7">
              <Checkbox
                id="newMembershipFeePaid"
                checked={feePaid}
                onCheckedChange={(value) => setFeePaid(value === true)}
              />
              <Label htmlFor="newMembershipFeePaid">Fee Paid</Label>
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="newMembershipComments">Comments</Label>
            <Input
              id="newMembershipComments"
              value={comments}
              onChange={(event) => setComments(event.target.value)}
              placeholder="Enter comments"
            />
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              size="sm"
              disabled={submitting}
              onClick={() => void saveMembership()}
            >
              {existing ? "Update" : "Save"}
            </Button>
          </div>
        </>
      ) : null}
      <DefaultMembershipListModal
        open={defaultListOpen}
        kind={kind}
        onClose={() => setDefaultListOpen(false)}
      />
      <FormModal
        open={previewPayload != null}
        onClose={() => setPreviewPayload(null)}
        title={
          existing ? "Update Membership Preview" : "New Membership Preview"
        }
        titleClassName="text-primary"
        size="md"
        submitLabel="Save"
        cancelLabel="Cancel"
        isSubmitting={submitting}
        onSubmit={(event) => {
          event.preventDefault();
          void persistMembership();
        }}
      >
        <dl className="grid grid-cols-[140px_1fr] gap-x-3 gap-y-2 rounded-md border p-4 text-sm">
          <dt className="text-muted-foreground">
            {kind === "S" ? "Student" : "Employee"}
          </dt>
          <dd>{String(selected?.memberName ?? selected?.firstName ?? "")}</dd>
          {kind === "S" ? (
            <>
              <dt className="text-muted-foreground">College / Course</dt>
              <dd>
                {[
                  selected?.collegeCode,
                  selected?.courseCode,
                  selected?.groupCode,
                  selected?.courseYearName,
                ]
                  .filter(Boolean)
                  .join(" / ")}
              </dd>
            </>
          ) : (
            <>
              <dt className="text-muted-foreground">Department</dt>
              <dd>{String(selected?.empDeptName ?? "")}</dd>
            </>
          )}
          <dt className="text-muted-foreground">Library</dt>
          <dd>
            {libraryOptions.find((option) => option.value === libraryId)
              ?.label ?? ""}
          </dd>
          <dt className="text-muted-foreground">Membership Id</dt>
          <dd>{memberCode}</dd>
          <dt className="text-muted-foreground">Membership Date</dt>
          <dd>
            {fromDate && toDate
              ? `${format(fromDate, "MMM d, yyyy")} - ${format(toDate, "MMM d, yyyy")}`
              : ""}
          </dd>
          <dt className="text-muted-foreground">No. of allowed books</dt>
          <dd>{maxBooks}</dd>
        </dl>
      </FormModal>
    </div>
  );
}
