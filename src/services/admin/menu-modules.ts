/**
 * Angular parity: user-management modules / sub-modules / pages
 *
 * Entities: Module, Submodule, Page
 * Query key casing matches Angular CONSTANTS exactly.
 */

import {
  buildQuery,
  domainCreate,
  domainList,
  domainListRawQuery,
  domainUpdate,
} from "@/services/crud";

export interface NavModule {
  moduleId: number;
  moduleName?: string | null;
  displayName?: string | null;
  url?: string | null;
  iconName?: string | null;
  sortOrder?: number | string | null;
  isActive?: boolean;
  reason?: string | null;
  createdDt?: string | null;
}

export interface NavSubModule {
  subModuleId: number;
  submoduleName?: string | null;
  displayName?: string | null;
  url?: string | null;
  iconName?: string | null;
  sortOrder?: number | string | null;
  isActive?: boolean;
  reason?: string | null;
  moduleId?: number | string | null;
  moduleName?: string | null;
  createdDt?: string | null;
}

export interface NavPage {
  pageId: number;
  pageName?: string | null;
  displayName?: string | null;
  pageCode?: string | null;
  pageNo?: number | string | null;
  url?: string | null;
  iconName?: string | null;
  sortOrder?: number | string | null;
  isActive?: boolean;
  reason?: string | null;
  moduleId?: number | string | null;
  /** Angular PagesComponent uses `subModuleId`; add-submodule-pages Add uses `submoduleId`. */
  subModuleId?: number | string | null;
  submoduleId?: number | string | null;
}

/** Angular `listAllDetails(Module)` → order(createdDt=desc), no isActive filter. */
export async function listAllModules(): Promise<NavModule[]> {
  return domainList<NavModule>(
    "Module",
    buildQuery({}, { field: "createdDt", direction: "DESC" }),
  );
}

/** Angular modal dropdown: `isActive==true`. */
export async function listActiveModules(): Promise<NavModule[]> {
  return domainList<NavModule>("Module", buildQuery({ isActive: true }));
}

export async function createModule(
  data: Partial<NavModule>,
): Promise<NavModule> {
  return domainCreate<NavModule>("Module", data);
}

export async function updateModule(
  moduleId: number,
  data: Partial<NavModule>,
): Promise<NavModule> {
  return domainUpdate<NavModule>("Module", "moduleId", moduleId, {
    ...data,
    moduleId,
  });
}

/**
 * Angular: `listDetailsById(Submodule, moduleId, Module.moduleId)`
 * → `domain/list/Submodule?query=Module.moduleId=={id}`
 */
export async function listSubModulesByModuleId(
  moduleId: number,
): Promise<NavSubModule[]> {
  if (!moduleId) return [];
  return domainList<NavSubModule>(
    "Submodule",
    buildQuery({ "Module.moduleId": moduleId }),
  );
}

export async function createSubModule(
  data: Partial<NavSubModule>,
): Promise<NavSubModule> {
  return domainCreate<NavSubModule>("Submodule", data);
}

export async function updateSubModule(
  subModuleId: number,
  data: Partial<NavSubModule>,
): Promise<NavSubModule> {
  return domainUpdate<NavSubModule>("Submodule", "subModuleId", subModuleId, {
    ...data,
    subModuleId,
  });
}

/**
 * Angular Pages (module-scoped):
 * `domain/list/Page?query=Module.moduleId=={moduleId}`
 */
export async function listPagesByModuleId(
  moduleId: number,
): Promise<NavPage[]> {
  if (!moduleId) return [];
  return domainList<NavPage>(
    "Page",
    buildQuery({ "Module.moduleId": moduleId }),
  );
}

/**
 * Angular add-submodule-pages:
 * `domain/list/Page?query=SubModule.subModuleId=={subModuleId}`
 */
export async function listPagesBySubModuleId(
  subModuleId: number,
): Promise<NavPage[]> {
  if (!subModuleId) return [];
  return domainList<NavPage>(
    "Page",
    buildQuery({ "SubModule.subModuleId": subModuleId }),
  );
}

/**
 * Angular only-pages / direct-pages:
 * `Module.moduleId==null.and.SubModule.subModuleId==null.order(pageId=DESC)`
 * (buildQuery drops null — use raw query).
 */
export async function listOrphanPages(): Promise<NavPage[]> {
  return domainListRawQuery<NavPage>(
    "Page",
    "Module.moduleId==null.and.SubModule.subModuleId==null.order(pageId=DESC)",
  );
}

export async function createPage(data: Partial<NavPage>): Promise<NavPage> {
  return domainCreate<NavPage>("Page", data);
}

export async function updatePage(
  pageId: number,
  data: Partial<NavPage>,
): Promise<NavPage> {
  return domainUpdate<NavPage>("Page", "pageId", pageId, {
    ...data,
    pageId,
  });
}
