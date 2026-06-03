'use client'

import { ItemRequestForm } from '@/app/(pages)/(protected)/e-office/item-request/_components/ItemRequestForm'

const INTERNAL_INDENT_LIST = '/inventory-management/internal-indent'

export default function AddInternalIndentPage() {
  return <ItemRequestForm listPath={INTERNAL_INDENT_LIST} />
}
