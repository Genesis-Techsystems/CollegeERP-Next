"use client";

import { useEffect, useState } from "react";
import type { SelectOption } from "@/common/components/select";
import {
  listActiveOrganizationsForLibrary,
  listLibraryDetailsByOrganization,
} from "@/services";

export function useLibraryOrgLibraryOptions(
  organizationId?: number,
  libraryId?: number,
  enabled = true,
) {
  const [organizations, setOrganizations] = useState<SelectOption[]>([]);
  const [libraries, setLibraries] = useState<SelectOption[]>([]);
  const [loadingLibraries, setLoadingLibraries] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    void listActiveOrganizationsForLibrary().then((rows) => {
      setOrganizations(
        rows.map((o) => ({
          value: String(o.organizationId),
          label: o.orgCode ?? o.orgName ?? String(o.organizationId),
        })),
      );
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !organizationId) {
      setLibraries([]);
      return;
    }
    setLoadingLibraries(true);
    void listLibraryDetailsByOrganization(organizationId)
      .then((rows) => {
        setLibraries(
          rows.map((lib) => ({
            value: String(lib.libraryId),
            label: lib.libraryCode ?? lib.libraryName ?? String(lib.libraryId),
          })),
        );
      })
      .finally(() => setLoadingLibraries(false));
  }, [enabled, organizationId]);

  const libraryLabel =
    libraries.find((o) => o.value === String(libraryId))?.label ?? "";

  return { organizations, libraries, loadingLibraries, libraryLabel };
}
