/** Library module types — mirrors Angular models under `apps/library`. */

export interface LibraryDetail {
  libraryId?: number;
  organizationId?: number;
  campusId?: number;
  collegeId?: number;
  roomId?: number;
  orgCode?: string;
  campusCode?: string;
  collegeCode?: string;
  libraryCode?: string;
  libraryName?: string;
  roomName?: string;
  isActive?: boolean;
  reason?: string;
}

export type LibraryDetailPayload = Pick<
  LibraryDetail,
  | "organizationId"
  | "campusId"
  | "collegeId"
  | "roomId"
  | "libraryCode"
  | "libraryName"
  | "isActive"
  | "reason"
>;

export interface LibraryAuthor {
  authorId?: number;
  organizationId?: number;
  libraryId?: number;
  orgCode?: string;
  libraryCode?: string;
  libraryName?: string;
  firstName?: string;
  lastName?: string;
  shortName?: string;
  pseudonym?: string;
  isActive?: boolean;
  reason?: string;
}

export type LibraryAuthorPayload = Pick<
  LibraryAuthor,
  | "organizationId"
  | "libraryId"
  | "firstName"
  | "lastName"
  | "shortName"
  | "pseudonym"
  | "isActive"
  | "reason"
> &
  Pick<LibraryAuthor, "authorId">;

export interface LibraryPublisher {
  publisherId?: number;
  libraryId?: number;
  libraryCode?: string;
  libraryName?: string;
  publishername?: string;
  shortName?: string;
  date?: string;
  isActive?: boolean;
  reason?: string;
}

export type LibraryPublisherPayload = Pick<
  LibraryPublisher,
  "libraryId" | "publishername" | "shortName" | "date" | "isActive" | "reason"
> &
  Pick<LibraryPublisher, "publisherId">;

export interface LibraryRack {
  shelveId?: number;
  organizationId?: number;
  libraryId?: number;
  orgCode?: string;
  libraryName?: string;
  shelveName?: string;
  shelveCode?: string;
  noOfRows?: number;
  noOfColumns?: number;
  blockCapacity?: number;
  totalCapacity?: number;
  location?: string;
  isActive?: boolean;
  reason?: string;
}

export type LibraryRackPayload = Pick<
  LibraryRack,
  | "organizationId"
  | "libraryId"
  | "shelveName"
  | "shelveCode"
  | "noOfRows"
  | "noOfColumns"
  | "blockCapacity"
  | "totalCapacity"
  | "location"
  | "isActive"
  | "reason"
>;

export interface LibraryBookCategory {
  bookcatId?: number;
  organizationId?: number;
  libraryId?: number;
  libCategoryId?: number;
  orgCode?: string;
  libraryCode?: string;
  libraryName?: string;
  bookCategoryCode?: string;
  bookCategoryName?: string;
  isActive?: boolean;
  reason?: string;
}

export type LibraryBookCategoryPayload = Pick<
  LibraryBookCategory,
  "organizationId" | "libraryId" | "libCategoryId" | "isActive" | "reason"
>;

export interface LibraryCategory {
  libCategoryId?: number;
  /** Angular form field name on create/update (not organizationId). */
  orgId?: number;
  bookCategoryCode?: string;
  bookCategoryName?: string;
  deptNo?: string;
  /** Checkbox on Angular add/edit modal. */
  inBarcode?: boolean;
  orgCode?: string;
  isActive?: boolean;
  reason?: string;
}

export type LibraryCategoryPayload = Pick<
  LibraryCategory,
  | "orgId"
  | "bookCategoryCode"
  | "bookCategoryName"
  | "deptNo"
  | "inBarcode"
  | "isActive"
  | "reason"
> & {
  /** Set on update only — Angular assigns before `updateDetails`. */
  libCategoryId?: number;
};

export interface LibrarySupplier {
  supplierId?: number;
  organizationId?: number;
  orgCode?: string;
  suppliername?: string;
  suppliercode?: string;
  contactPersonName?: string;
  address?: string;
  phoneNo?: string;
  isActive?: boolean;
  reason?: string;
}

export type LibrarySupplierPayload = Pick<
  LibrarySupplier,
  | "organizationId"
  | "suppliername"
  | "suppliercode"
  | "contactPersonName"
  | "address"
  | "phoneNo"
  | "isActive"
  | "reason"
>;

export interface LibraryMembership {
  libMemberId?: number;
  memberShipId?: number;
  memberCode?: string;
  membershipNo?: string;
  membershipId?: string;
  memberName?: string;
  membertype?: "S" | "E" | string;
  firstName?: string;
  lastName?: string;
  memberType?: string;
  studentId?: number;
  employeeId?: number;
  hallticketNumber?: string;
  rollNumber?: string;
  empNumber?: string;
  empDeptName?: string;
  collegeCode?: string;
  collegeName?: string;
  organizationId?: number;
  libraryId?: number;
  libraryCode?: string;
  libraryName?: string;
  noOfMaxBooks?: number;
  noOfBorrowedBooks?: number;
  memberFromDt?: string;
  memberToDt?: string;
  memberBarcode?: string | null;
  isFeepaid?: boolean;
  comments?: string;
  studentDetail?: Record<string, unknown> | null;
  employeeDetail?: Record<string, unknown> | null;
  isActive?: boolean;
  reason?: string;
  [key: string]: unknown;
}

export type LibraryMembershipPayload = Partial<LibraryMembership> & {
  student?: Record<string, unknown>[] | null;
  employee?: Record<string, unknown>[] | null;
};
