'use client'

import { useSearchParams } from 'next/navigation'
import { ItemRequestForm } from '../_components/ItemRequestForm'

export default function EditItemRequestPage() {
  const searchParams = useSearchParams()
  const indentId = Number(searchParams.get('indentId') ?? 0)
  return <ItemRequestForm indentId={indentId > 0 ? indentId : undefined} />
}
