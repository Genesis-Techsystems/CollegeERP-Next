'use client'

import { useSearchParams } from 'next/navigation'
import { ItemRequestForm } from '@/app/(pages)/(protected)/e-office/item-request/_components/ItemRequestForm'

const INTERNAL_INDENT_LIST = '/inventory-management/internal-indent'

export default function EditInternalIndentPage() {
  const searchParams = useSearchParams()
  const indentId = Number(searchParams.get('id') ?? searchParams.get('indentId') ?? 0)
  return (
    <ItemRequestForm
      indentId={indentId > 0 ? indentId : undefined}
      listPath={INTERNAL_INDENT_LIST}
    />
  )
}
