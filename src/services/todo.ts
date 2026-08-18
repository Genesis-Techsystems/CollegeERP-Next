/**
 * To-Do module — Angular `app/main/apps/to-do/*`.
 *
 * Entities: EmpTodoListTags, EmpActivityList (lookup only), EmpTodoList.
 * Employee typeahead: Angular `listByIds(employeeSearchUrl, q, 'q')`
 * → GET `employeesearch?q=` (no collegeId, no empStatus).
 */

import { TODO_API } from "@/config/constants/api";
import { ENTITIES } from "@/config/constants/entities";
import type { College } from "@/types/college";
import type {
  EmpActivityListItem,
  EmpTodoListItem,
  EmpTodoListTag,
} from "@/types/todo";
import {
  buildQuery,
  domainCreate,
  domainList,
  domainUpdate,
  fetchDetails,
} from "./crud";

type AnyRow = Record<string, unknown>;

const TAG_PK = "empTodoListTagId";
const TODO_PK = "empTodoListId";

function employeeSearchRows(data: unknown): AnyRow[] {
  if (Array.isArray(data)) return data as AnyRow[];
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.resultList)) return obj.resultList as AnyRow[];
    if (Array.isArray(obj.data)) return obj.data as AnyRow[];
    if (Array.isArray(obj.content)) return obj.content as AnyRow[];
    if (Array.isArray(obj.result)) return obj.result as AnyRow[];
  }
  return [];
}

/**
 * Angular `enteredEmployee` → `listByIds('employeesearch', value, 'q')`
 * when `event.target.value.length > 4`. Browser: GET `/api/proxy/employeesearch?q=`.
 */
export async function searchEmployeesForTodo(term: string): Promise<AnyRow[]> {
  const q = term.trim();
  if (q.length <= 4) return [];
  const data = await fetchDetails<unknown>("employeesearch", { q });
  return employeeSearchRows(data);
}

// ─── Colleges (Angular `listDetailsById(collegeCrudUrl, 'true', 'isActive')`) ──

export async function listActiveCollegesForTodo(): Promise<College[]> {
  return domainList<College>(
    ENTITIES.COLLEGE.name,
    buildQuery({ isActive: true }),
  );
}

// ─── EmpTodoListTags ────────────────────────────────────────────────────────

/**
 * Angular `listDetailsByTwoIds(TodoTagListCrudUrl, collegeId, 'true', 'College.collegeId', 'isActive')`
 * → `domain/list/EmpTodoListTags?query=College.collegeId==<id>.and.isActive==true`.
 */
export async function listTodoListTagsByCollege(
  collegeId: number,
): Promise<EmpTodoListTag[]> {
  if (!collegeId) return [];
  return domainList<EmpTodoListTag>(
    TODO_API.TAGS,
    buildQuery({ "College.collegeId": collegeId, isActive: true }),
  );
}

/** Angular `TaglistAllDetails(TodoTagListCrudUrl)` — unfiltered; used as the Tag lookup inside Add TODO. */
export async function listTodoTagsLookup(): Promise<EmpTodoListTag[]> {
  return domainList<EmpTodoListTag>(TODO_API.TAGS);
}

/** Angular `addTodoListTags(TodolistTagCrudUrl, details)`. */
export async function createTodoListTag(
  data: Partial<EmpTodoListTag>,
): Promise<EmpTodoListTag> {
  return domainCreate<EmpTodoListTag>(TODO_API.TAGS, data);
}

/** Angular `updateToTagDetails(UpdateTodoTags, details, empTodoListTagId, 'empTodoListTagId')`. */
export async function updateTodoListTag(
  empTodoListTagId: number,
  data: Partial<EmpTodoListTag>,
): Promise<EmpTodoListTag> {
  return domainUpdate<EmpTodoListTag>(TODO_API.TAGS, TAG_PK, empTodoListTagId, {
    empTodoListTagId,
    ...data,
  });
}

// ─── EmpActivityList (lookup only — Angular `TaglistAllDetails(TodoActivityListCrudUrl)`) ──

export async function listTodoActivityLookup(): Promise<EmpActivityListItem[]> {
  return domainList<EmpActivityListItem>(TODO_API.ACTIVITIES);
}

// ─── EmpTodoList ────────────────────────────────────────────────────────────

/**
 * Angular `TodolistAllDetails(TodoListCrudUrl)` — unfiltered domain list.
 * The page filters rows to the viewed calendar month client-side (Angular
 * `getEvents()` compares `startOfDay(parseISO(todoDate)).getMonth()`).
 */
export async function listAllTodos(): Promise<EmpTodoListItem[]> {
  return domainList<EmpTodoListItem>(TODO_API.TODO_LIST);
}

/** Angular `addTodoList(TodoCrudUrl, details)`. */
export async function createTodo(
  data: Partial<EmpTodoListItem>,
): Promise<EmpTodoListItem> {
  return domainCreate<EmpTodoListItem>(TODO_API.TODO_LIST, data);
}

/** Angular `updateTodoDetails(UpdateTodoList, details, empTodoListId, 'empTodoListId')`. */
export async function updateTodo(
  empTodoListId: number,
  data: Partial<EmpTodoListItem>,
): Promise<EmpTodoListItem> {
  return domainUpdate<EmpTodoListItem>(
    TODO_API.TODO_LIST,
    TODO_PK,
    empTodoListId,
    {
      empTodoListId,
      ...data,
    },
  );
}
