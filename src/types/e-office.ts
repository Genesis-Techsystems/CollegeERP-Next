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
  collegeId?: number;
  indentDate?: string;
  purpose?: string;
  isActive?: boolean;
  reason?: string;
  internalIndWfStage?: number;
  internalIndWfStageName?: string;
  indentRaisedEmpId?: number;
  invTranstypeCatdetId?: number;
  /** Angular list/view field name */
  invTranstypeCatdetIdDisplayName?: string;
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
  receivedQty?: number;
  itemDiscountPercentage?: number;
  itemTaxPercentage?: number;
  itemTotalActualAmount?: number;
  itemTotalDiscountAmount?: number;
  itemTotalCost?: number;
  authorizedByEmpId?: number;
  reason?: string;
  igst?: number;
  isReqTracking?: boolean;
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
  invTranstypeCatdetDisplayName?: string;
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
  poStatusCatdetDisplayName?: string;
  poWorkFlowName?: string;
  poWorkFlowStage?: number;
  storeId?: number;
  storeName?: string;
  supplierId?: number;
  supplierName?: string;
  accountTypeId?: number;
  accounttypeCode?: string;
  accounttypeName?: string;
  financialYearId?: number;
  financialYear?: string;
  accountEntityId?: number;
  /** GET invpurchaseorder returns entity as entityTypeId (Angular edit uses this). */
  entityTypeId?: number;
  templateName?: string;
  subjectTextCode?: string;
  entityType?: string;
  paymentNoteFlag?: number;
  requestText2?: string;
  requestText3?: string;
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
  /** Angular store master field used for finance college filter */
  collegeIds?: number;
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

/** Angular `payment-note-approvals` stored-proc row (`mgr_purchaseorder_list`). */
export type PaymentNoteApprovalRow = {
  flag?: string;
  pk_po_id?: number;
  pono?: string;
  po_date?: string;
  indent_requested_for?: string;
  raised_emp_name?: string;
  purpose?: string;
  current_wf_status_name?: string;
  current_wf_status?: string;
  current_wf_stage?: number;
  next_wf_stage?: number;
  fk_po_wf_stage_id?: number;
  status_comments?: string | null;
  store_name?: string;
  indent_type_code?: string;
  compare_statement_path?: string | null;
  po_ref_file_path2?: string | null;
  indent_purpose?: string;
  wf_stage?: number;
  /** Set client-side when opening modal (`approvalDetails` | `viewDetails` | `updateDetails`). */
  value?: string;
};

export type PaymentNotePoItemRow = {
  flag?: string;
  item_name?: string;
  item_code?: string;
  order_quantity?: number;
  unit_price?: number;
  item_discount_percentage?: number;
  item_total_cost?: number;
};

export type PaymentNotePoWfRow = {
  flag?: string;
  pk_po_wf_id?: number;
  stage?: number;
  workflow?: string;
  status_updated_employee?: string;
  emp_number?: string;
  wf_document_path?: string | null;
  workflow_status?: string;
  status_comments?: string;
};

export type PaymentNoteWfStageOption = {
  flag?: string;
  pk_wf_stage_id?: number;
  wf_name?: string;
};

export type GeneralDetailOption = {
  generalDetailId: number;
  generalDetailCode?: string;
  generalDetailDisplayName?: string;
};
