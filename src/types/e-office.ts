/** E-Office — letter formats, internal indents, payment note (purchase orders). */

export type OfficeLetterFormatRow = {
  officeLetterFormatsId?: number;
  organizationId?: number;
  collegeId?: number;
  collegeName?: string;
  formatCode?: string;
  formatDescription?: string;
  htmlContent?: string;
  messageContent?: string;
  emailContent?: string;
  isActive?: boolean;
  reason?: string;
};

export type InvInternalIndentItemRow = {
  interIndItemId?: number;
  itemId?: number;
  itemCode?: string;
  itemName?: string;
  indentQuantity?: number;
  /** Angular indent→PO maps `issuedQty` into orderQuantity */
  issuedQty?: number;
  orderQuantity?: number;
  receivedQty?: number;
  unitPrice?: number;
  itemDiscountPercentage?: number;
  itemTotalCost?: number;
  itemTotalActualAmount?: number;
  itemTotalDiscountAmount?: number;
  isActive?: boolean;
  isReqTracking?: boolean;
  storeId?: number;
};

export type InvInternalIndentRow = {
  internalIndId?: number;
  internalIndNo?: string;
  storeId?: number;
  storeCode?: string;
  storeName?: string;
  indentDate?: string;
  purpose?: string;
  isActive?: boolean;
  internalIndWfStage?: number;
  internalIndWfStageName?: string;
  indentRaisedEmpId?: number;
  invTranstypeCatdetId?: number;
  invTranstypeCatdetDisplayName?: string;
  poId?: number;
  invInternalIndentitems?: InvInternalIndentItemRow[];
};

export type InvPoItemRow = {
  poItemId?: number;
  itemId?: number;
  itemCode?: string;
  itemName?: string;
  unitPrice?: number;
  orderQuantity?: number;
  itemDiscountPercentage?: number;
  itemTotalCost?: number;
  isActive?: boolean;
};

export type InvPurchaseOrderRow = {
  poId?: number;
  pono?: string;
  poDate?: string;
  potypeCatdetId?: number;
  potypeCatdetDisplayName?: string;
  invTranstypeCatdetId?: number;
  invTranstypeCatdetCode?: string;
  poActualAmount?: number;
  poNetCost?: number;
  invoiceNo?: string;
  sgst?: number;
  igst?: number;
  shippingCharges?: number;
  otherCharges?: number;
  termsconditions?: string;
  subjectText?: string;
  requestText?: string;
  poComments?: string;
  poStatusCatdetId?: number | null;
  poWorkFlowName?: string;
  poWorkFlowStage?: number;
  storeId?: number;
  storeName?: string;
  supplierId?: number;
  supplierName?: string;
  accountTypeId?: number;
  financialYearId?: number;
  isActive?: boolean;
  wfDocumentPath?: string;
  poRefFilePath1?: string;
  poRefFilePath2?: string;
  authorizationComments?: string;
  invPoItems?: InvPoItemRow[];
  invInternalIndentIds?: string;
  createdDt?: string;
};

export type InvStoreRow = {
  storeId: number;
  storeCode?: string;
  storeName?: string;
  collegeId?: number;
};

export type InvSupplierRow = {
  supplierId: number;
  supplierName?: string;
};

export type InvItemMasterRow = {
  itemId: number;
  itemCode?: string;
  itemName?: string;
};

export type GeneralDetailOption = {
  generalDetailId: number;
  generalDetailCode?: string;
  generalDetailDisplayName?: string;
};
