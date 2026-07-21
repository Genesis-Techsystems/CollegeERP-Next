"use client";

import { useEffect, useState } from "react";
import { Monitor } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageContainer } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { QK } from "@/lib/query-keys";
import { getErrorMessage } from "@/lib/errors";
import { toastError, toastSuccess } from "@/lib/toast";
import {
  listActivePayslipBranchSettings,
  listPayslipSettings,
  savePayslipBranchSettings,
} from "@/services";

type AnyRow = Record<string, unknown>;

type PayslipField = AnyRow & {
  checked: boolean;
  collegeId?: number;
  payslipSettingId?: number;
  payslipBranchSettingId?: number;
  fieldName?: string;
  fieldSortOrder?: number;
};

type PayslipGroup = {
  groupName: string;
  groupSortOrder: number;
  payslipSettingId?: number;
  payFields: PayslipField[];
};

function buildPayslipGroups(
  settings: AnyRow[],
  branchSettings: AnyRow[],
): PayslipGroup[] {
  const groups: PayslipGroup[] = [];

  // Match Angular exactly: group master fields by groupSortOrder.
  for (const setting of settings) {
    const groupSortOrder = Number(setting.groupSortOrder ?? 0);
    let group = groups.find((item) => item.groupSortOrder === groupSortOrder);
    if (!group) {
      group = {
        groupName: String(setting.groupName ?? ""),
        groupSortOrder,
        payslipSettingId: Number(setting.payslipSettingId) || undefined,
        payFields: [],
      };
      groups.push(group);
    }

    const fieldSortOrder = Number(setting.fieldSortOrder ?? 0);
    const selected = branchSettings.find(
      (branch) => Number(branch.fieldSortOrder ?? 0) === fieldSortOrder,
    );

    group.payFields.push({
      checked: Boolean(selected),
      collegeId: Number(setting.collegeId) || undefined,
      payslipSettingId: Number(setting.payslipSettingId) || undefined,
      fieldName: String(setting.fieldName ?? ""),
      fieldSortOrder,
      ...(selected
        ? {
            payslipBranchSettingId:
              Number(selected.payslipBranchSettingId) || undefined,
          }
        : {}),
    });
  }

  return groups;
}

export function PayslipSettingsPage() {
  const [groups, setGroups] = useState<PayslipGroup[]>([]);
  const [saving, setSaving] = useState(false);

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: [...QK.hrPayroll.payslipSettings(), "branch-settings"],
    queryFn: async () => {
      const settings = await listPayslipSettings();
      const branchSettings = await listActivePayslipBranchSettings();
      return { settings, branchSettings };
    },
  });

  useEffect(() => {
    if (!data) return;
    setGroups(buildPayslipGroups(data.settings, data.branchSettings));
  }, [data]);

  const setChecked = (
    groupIndex: number,
    fieldIndex: number,
    checked: boolean,
  ) => {
    setGroups((current) =>
      current.map((group, gi) =>
        gi !== groupIndex
          ? group
          : {
              ...group,
              payFields: group.payFields.map((field, fi) =>
                fi === fieldIndex ? { ...field, checked } : field,
              ),
            },
      ),
    );
  };

  const handleSave = async () => {
    const settings: AnyRow[] = [];

    // Angular payload:
    // - checked fields are sent with isActive=true
    // - previously saved unchecked fields are sent with isActive=false
    // - never-saved unchecked fields are omitted
    for (const group of groups) {
      for (const field of group.payFields) {
        if (field.checked) {
          settings.push({ ...field, isActive: true });
        } else if (field.payslipBranchSettingId) {
          settings.push({ ...field, isActive: false });
        }
      }
    }

    setSaving(true);
    try {
      await savePayslipBranchSettings(settings);
      toastSuccess("Payslip settings saved");
      await refetch();
    } catch (saveError) {
      toastError(saveError, "Failed to save payslip settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer>
      <div className="app-card overflow-hidden">
        <div className="border-b border-[#e8c547] px-4 py-3">
          <h1 className="inline-flex items-center gap-2 text-[15px] font-semibold text-[hsl(var(--card-title))]">
            <Monitor className="h-4 w-4 shrink-0" aria-hidden />
            Payslip Settings
          </h1>
        </div>

        {isFetching && groups.length === 0 ? (
          <p className="px-4 py-8 text-sm text-muted-foreground">
            Loading payslip settings…
          </p>
        ) : error ? (
          <p className="px-4 py-6 text-sm text-destructive">
            {getErrorMessage(error)}
          </p>
        ) : (
          <div className="space-y-5 p-4">
            <p className="font-mono text-[12px] text-[#9e9e9e]">
              Configure information to be displayed in employee payslips.
            </p>

            {groups.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No active payslip settings found.
              </p>
            ) : (
              <div className="space-y-4">
                {groups.map((group, groupIndex) => (
                  <section
                    key={`${group.groupSortOrder}-${group.groupName}`}
                    className="space-y-2"
                  >
                    <h2 className="border-b border-slate-200 pb-1 text-[14px] font-semibold text-[hsl(var(--card-title))]">
                      {group.groupName}
                    </h2>
                    <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
                      {group.payFields.map((field, fieldIndex) => (
                        <label
                          key={`${field.payslipSettingId ?? fieldIndex}-${field.fieldSortOrder}`}
                          className="flex cursor-pointer items-center gap-2 py-1 text-sm"
                        >
                          <Checkbox
                            checked={field.checked}
                            onCheckedChange={(checked) =>
                              setChecked(
                                groupIndex,
                                fieldIndex,
                                checked === true,
                              )
                            }
                          />
                          <span>{field.fieldName}</span>
                        </label>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button
                type="button"
                size="sm"
                disabled={saving || isFetching}
                onClick={() => void handleSave()}
              >
                {saving ? "Saving…" : "Save Details"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageContainer>
  );
}
