/** Inventory management module types — mirrors Angular `inventory/`. */

export interface InvStore {
  storeId: number
  organizationId?: number
  orgCode?: string
  storeCode?: string
  storeName?: string
  empName?: string
  collegeIds?: string
  employeeId?: number
  isActive: boolean
  reason?: string
}

export interface InvUom {
  uomId: number
  organizationId?: number
  orgCode?: string
  uomCode?: string
  uomName?: string
  parentUomId?: number
  conversionqty?: number
  isActive: boolean
  reason?: string
}

export interface InvSupplier {
  supplierId: number
  organizationId?: number
  orgCode?: string
  supplierName?: string
  offaddline1?: string
  offaddline2?: string
  stateId?: number
  districtId?: number
  cityId?: number
  officePincode?: string
  officeEmail?: string
  officeFax?: string
  officeWebsite?: string
  contact1Name?: string
  contact1Phone?: string
  contact1Email?: string
  contact2Name?: string
  contact2Phone?: string
  contact2Email?: string
  cstno?: string
  gstno?: string
  startdate?: string
  enddate?: string
  isActive: boolean
  reason?: string
}

export interface InvItemCategory {
  itemCategoryId: number
  organizationId?: number
  orgCode?: string
  categoryCode?: string
  categoryName?: string
  isActive: boolean
  reason?: string
}

export interface InvItemSubCategory {
  itemSubcategoryId: number
  organizationId?: number
  orgCode?: string
  itemCategoryId?: number
  categoryName?: string
  subcategoryCode?: string
  subcategoryName?: string
  isActive: boolean
  reason?: string
}

export interface InvBrand {
  brandmasterId: number
  organizationId?: number
  orgCode?: string
  brandCode?: string
  brandName?: string
  isActive: boolean
  reason?: string
}

export interface InvItem {
  itemId: number
  organizationId?: number
  orgCode?: string
  itemCode?: string
  itemName?: string
  itemAliasname?: string
  itemTypeCatdetId?: number
  itemTypeCatdetDisplayName?: string
  itemCategoryId?: number
  categoryName?: string
  itemSubcategoryId?: number
  subCategoryName?: string
  brandmasterId?: number
  brandName?: string
  make?: string
  model?: string
  supplierId?: number
  supplierName?: string
  isReqTracking?: boolean
  isActive: boolean
  reason?: string
}

export interface InvOpeningStock {
  itemopeningStockId: number
  storeId?: number
  storeName?: string
  itemId?: number
  itemName?: string
  itemPrice?: number
  qty?: number
  totalPrice?: number
  academicYearId?: number
  academicYear?: string
  isActive: boolean
  reason?: string
}

export interface InvPurchaseOrderListRow {
  poId: number
  pono?: string
  poDate?: string
  potypeCatdetDisplayName?: string
  poType?: string
  poActualAmount?: number
  isActive: boolean
}

export interface InvStockReceiptVoucher {
  srvId?: number
  srvNo?: string
  poId?: number
  pono?: string
  storeId?: number
  storeName?: string
  supplierId?: number
  supplierName?: string
  invTranstypeCatdetId?: number
  invTranstypeCatdetDisplayName?: string
  srvDate?: string
  deliverychallanno?: string
  deliverychallandate?: string
  srvActualAmount?: number
  igst?: number
  sgst?: number
  srvDiscount?: number
  srvTax?: number
  poNetCost?: number
  isActive: boolean
  invSrvItemDTOs?: InvSrvItemRow[]
}

export interface InvSrvItemRow {
  poItemId?: number
  itemId?: number
  itemCode?: string
  itemName?: string
  unitPrice?: number
  orderQuantity?: number
  itemDiscountPercentage?: number
  itemTotalCost?: number
  receivedQty?: number
  returnedQty?: number
  itemUnitAmount?: number
  itemTotalDiscountAmount?: number
  isActive?: boolean
  isReqTracking?: boolean
}

export interface InvPurchaseReturn {
  purchaseReturnId?: number
  purchaseReturnNo?: string
  srvId?: number
  poId?: number
  storeId?: number
  supplierId?: number
  storeName?: string
  supplierName?: string
  invTranstypeCatdetId?: number
  invTranstypeCatdetDisplayName?: string
  purchaseReturnDate?: string
  returnActualAmount?: number
  returnDiscount?: number
  returnAmount?: number
  isActive: boolean
  createdDt?: string
  purchaseReturnItem?: InvPurchaseReturnItemRow[]
}

export interface InvPurchaseReturnItemRow {
  prItemId?: number
  itemId?: number
  itemCode?: string
  itemName?: string
  itemUnitAmount?: number
  unitPrice?: number
  orderQuantity?: number
  returnedQty?: number
  itemDiscountPercentage?: number
  itemTotalDiscountAmount?: number
  itemTotalCost?: number
  isActive?: boolean
  checked?: boolean
  createdDt?: string
}

export interface InvInternalIndentListRow {
  internalIndId: number
  internalIndNo?: string
  indentDate?: string
  purpose?: string
  isActive: boolean
}

export interface InvInternalIssueItemRow {
  interIssueItemId?: number
  itemId?: number
  itemCode?: string
  itemName?: string
  indentQuantity?: number
  orderQuantity?: number
  unitPrice?: number
  issuedQty?: number
  rejectedQty?: number
  returnedQty?: number
  isActive?: boolean
  checked?: boolean
  createdDt?: string
}

export interface InvInternalIssueDetail {
  interIssueId?: number
  internalIssueNo?: string
  internalIndId?: number
  internalIndNo?: string
  issueDate?: string
  toEmployeeId?: number
  toEmpName?: string
  storeId?: number
  storeCode?: string
  storeName?: string
  poId?: number
  invTranstypeCatdetId?: number
  invTranstypeCatdetIdDisplayName?: string
  isActive?: boolean
  createdDt?: string
  invInternalIssueItemDTOs?: InvInternalIssueItemRow[]
}

export interface InvInternalIssue {
  interIssueId?: number
  internalIssueNo?: string
  issueDate?: string
  storeCode?: string
  toEmpName?: string
  Quantity?: number
  isActive: boolean
}

export interface InvInternalReturnItemRow {
  interReturnItemId?: number
  interIssueItemId?: number
  itemId?: number
  itemCode?: string
  itemName?: string
  indentQuantity?: number
  orderQuantity?: number
  returnedQty?: number
  isActive?: boolean
  checked?: boolean
  createdDt?: string
}

export interface InvInternalReturnDetail {
  interReturnId?: number
  internalReturnNo?: string
  interIssueId?: number
  returnDate?: string
  returnPurpose?: string
  storeId?: number
  storeCode?: string
  storeName?: string
  fromEmployeeId?: number
  fromEmpName?: string
  poId?: number
  invTranstypeCatdetId?: number
  isActive?: boolean
  createdDt?: string
  invInternalReturnItemDTOs?: InvInternalReturnItemRow[]
}

export interface InvInternalReturn {
  interReturnId?: number
  internalReturnNo?: string
  returnDate?: string
  storeCode?: string
  fromEmpName?: string
  isActive: boolean
}

export interface InvStockLedger {
  stockledgerId: number
  storeId?: number
  storeName?: string
  storeCode?: string
  itemId?: number
  itemName?: string
  itemCode?: string
  transactionDate?: string
  transactionno?: string
  costprice?: number
  itemQty?: number
  totalprice?: number
  invTranstypeCatdetId?: number
  invTranstypeCatdetCode?: string
  invTranstypeCatdetDisplayName?: string
  isActive: boolean
  reason?: string
  createdDt?: string
}
