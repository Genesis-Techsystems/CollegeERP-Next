'use client'

import { useMemo } from 'react'
import type { ColDef } from 'ag-grid-community'
import { ListPage } from '@/components/layout'
import { useCrudList } from '@/hooks/useCrudList'
import { QK } from '@/lib/query-keys'
import { rowIndexGetter } from '@/lib/utils'
import { listStudentEnquiries } from '@/services'
import type { StudentEnquiryRow } from '@/types/admission'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<StudentEnquiryRow>,
  studentName: { field: 'studentName', headerName: 'Student', minWidth: 140, flex: 1 } as ColDef<StudentEnquiryRow>,
  enquiryDate: { field: 'enquiryDate', headerName: 'Enquiry Date', minWidth: 110 } as ColDef<StudentEnquiryRow>,
  returnDate: { field: 'returnDate', headerName: 'Return Date', minWidth: 110 } as ColDef<StudentEnquiryRow>,
  sourceofenquiry: { field: 'sourceofenquiry', headerName: 'Source', minWidth: 100 } as ColDef<StudentEnquiryRow>,
  mobileNumber: { field: 'mobileNumber', headerName: 'Mobile', minWidth: 110, flex: 0 } as ColDef<StudentEnquiryRow>,
  enquirystatusName: { field: 'enquirystatusName', headerName: 'Status', minWidth: 120 } as ColDef<StudentEnquiryRow>,
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
      title="Enquiry Status Search"
      rowData={rows}
      columnDefs={columnDefs}
      loading={loading}
      pagination
      toolbar={{
        search: true,
        searchPlaceholder: 'Search enquiries…',
        pdfDocumentTitle: 'Enquiry Status Search',
      }}
    />
  )
}
