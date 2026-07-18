'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import type { ColDef, ValueFormatterParams } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listStudentEnquiries } from '@/services'
import type { StudentEnquiryRow } from '@/types/admission'

/** Angular date pipe display: "Jul 18, 2026". */
function formatEnquiryDate(value: unknown): string {
  if (value == null || value === '') return ''
  const d = new Date(String(value))
  if (Number.isNaN(d.getTime())) return String(value)
  return format(d, 'MMM d, yyyy')
}

function dateFormatter(p: ValueFormatterParams<StudentEnquiryRow>) {
  return formatEnquiryDate(p.value)
}

// Header names mirror Angular Sold And Held Enquiries table columns.
const COL_DEFS = {
  siNo: { headerName: 'No.', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StudentEnquiryRow>,
  studentName: { field: 'studentName', headerName: 'Candidate Name', minWidth: 140, flex: 1 } as ColDef<StudentEnquiryRow>,
  enquiryDate: {
    field: 'enquiryDate',
    headerName: 'Enquiry Date',
    minWidth: 120,
    valueFormatter: dateFormatter,
  } as ColDef<StudentEnquiryRow>,
  returnDate: {
    field: 'returnDate',
    headerName: 'Return Date',
    minWidth: 120,
    valueFormatter: dateFormatter,
  } as ColDef<StudentEnquiryRow>,
  sourceofenquiry: { field: 'sourceofenquiry', headerName: 'Enquired Source', minWidth: 130 } as ColDef<StudentEnquiryRow>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Phone', minWidth: 110, flex: 0 } as ColDef<StudentEnquiryRow>,
  enquirystatusName: { field: 'enquirystatusName', headerName: 'Enquired Status', minWidth: 130 } as ColDef<StudentEnquiryRow>,
}

export default function EnquiryStatusSearchPage() {
  const { data: rows, isLoading: loading } = useCrudList({
    queryKey: QK.admission.enquiries(),
    queryFn: () => listStudentEnquiries(),
  })

  const columnDefs = useMemo<ColDef<StudentEnquiryRow>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.studentName,
      COL_DEFS.enquiryDate,
      COL_DEFS.returnDate,
      COL_DEFS.sourceofenquiry,
      COL_DEFS.mobileNumber,
      COL_DEFS.enquirystatusName,
    ],
    [],
  )

  return (
    <ListPage
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search enquiries…',
      }}
    />
  )
}
