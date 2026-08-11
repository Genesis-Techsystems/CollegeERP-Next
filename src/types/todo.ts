/** Angular `app/main/apps/to-do/*` — entity `EmpTodoListTags`. */
export interface EmpTodoListTag {
  empTodoListTagId: number;
  collegeId: number;
  collegeCode?: string;
  empId: number;
  empNumber?: string;
  employeeName?: string;
  firstName?: string;
  tag: string;
  isActive: boolean;
  reason?: string;
}

/** Angular `app/main/apps/to-do/*` — entity `EmpActivityList` (lookup only). */
export interface EmpActivityListItem {
  empActivityListId: number;
  collegeId?: number;
  empId?: number;
  listName: string;
  colorCode?: string;
  listIcon?: string;
  dueDate?: string;
  isActive?: boolean;
  isCompleted?: boolean;
  reason?: string;
}

/** Angular `app/main/apps/to-do/*` — entity `EmpTodoList`. */
export interface EmpTodoListItem {
  empTodoListId: number;
  collegeId: number;
  empId: number;
  empNumber?: string;
  employeeName?: string;
  firstName?: string;
  activityListId?: number | null;
  activityListName?: string;
  parentTodoListId?: number | null;
  title: string;
  notes?: string;
  url?: string;
  todoDate: string;
  /** Angular create payload always sends `'11:00:00'`. */
  todoTime?: string;
  empToDOListTagIds?: number | null;
  repeatCatdetId?: number;
  isFlaged?: boolean;
  endRepeatDate?: string | null;
  priorityCatdetId?: number;
  isCompleted?: boolean;
  isActive: boolean;
  reason?: string;
}
