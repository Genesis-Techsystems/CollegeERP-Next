"use client";

import { useEffect, useState } from "react";
import { FormModal } from "@/common/components/feedback";
import { DatePicker } from "@/common/components/date-picker";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toDateOnlyISO } from "@/common/generic-functions";

type EmpRow = Record<string, unknown>;

interface EditStaffDetailsModalProps {
  open: boolean;
  employee: EmpRow | null;
  saving?: boolean;
  onClose: () => void;
  onSave: (payload: EmpRow) => void;
}

function parseDate(value: unknown): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const d = new Date(String(value));
  return Number.isNaN(d.getTime()) ? null : d;
}

function isValidPhone(value: string): boolean {
  return /^[6-9]\d{9}$/.test(value.trim());
}

function isValidEmail(value: string): boolean {
  if (!value.trim()) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidName(value: string): boolean {
  return /^[A-Za-z0-9 .'-]+$/.test(value.trim()) && value.trim().length > 0;
}

export function EditStaffDetailsModal({
  open,
  employee,
  saving = false,
  onClose,
  onSave,
}: EditStaffDetailsModalProps) {
  const [firstName, setFirstName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState<Date | null>(null);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open || !employee) return;
    setFirstName(String(employee.firstName ?? ""));
    setMobile(String(employee.mobile ?? ""));
    setEmail(String(employee.email ?? ""));
    setDob(parseDate(employee.dateOfBirth));
    setTouched(false);
  }, [open, employee]);

  const nameError = touched && !isValidName(firstName);
  const mobileError = touched && !isValidPhone(mobile);
  const emailError = touched && !isValidEmail(email);
  const dobError = touched && !dob;

  function handleSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    setTouched(true);
    if (
      !employee ||
      !isValidName(firstName) ||
      !isValidPhone(mobile) ||
      !isValidEmail(email) ||
      !dob
    ) {
      return;
    }

    onSave({
      ...employee,
      firstName: firstName.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      dateOfBirth: toDateOnlyISO(dob),
    });
  }

  const empNumber = String(employee?.empNumber ?? "");

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title="Edit Employee Details"
      description={empNumber ? `Emp Number : ${empNumber}` : undefined}
      onSubmit={handleSubmit}
      isSubmitting={saving}
      submitLabel="Save"
      cancelLabel="Close"
      size="lg"
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-3">
          <Label htmlFor="hod-faculty-name">Full Name (as per SSC)</Label>
          <Input
            id="hod-faculty-name"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            required
          />
          {nameError ? (
            <p className="text-xs text-destructive">Enter a valid name</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hod-faculty-mobile">Mobile</Label>
          <Input
            id="hod-faculty-mobile"
            type="tel"
            maxLength={10}
            value={mobile}
            onChange={(e) =>
              setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))
            }
            required
          />
          {mobileError ? (
            <p className="text-xs text-destructive">
              Enter a valid mobile number
            </p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="hod-faculty-email">Email ID</Label>
          <Input
            id="hod-faculty-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {emailError ? (
            <p className="text-xs text-destructive">Enter a valid email</p>
          ) : null}
        </div>

        <div className="space-y-1.5">
          <Label>Date Of Birth</Label>
          <DatePicker
            value={dob}
            onChange={setDob}
            maxDate={new Date()}
            placeholder="Date Of Birth"
          />
          {dobError ? (
            <p className="text-xs text-destructive">
              Date of birth is required
            </p>
          ) : null}
        </div>
      </div>
    </FormModal>
  );
}
