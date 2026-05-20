'use client'



import { useMemo, useState } from 'react'

import { PencilIcon, PlusIcon } from 'lucide-react'

import type { ColDef, ICellRendererParams } from 'ag-grid-community'

import { useQuery } from '@tanstack/react-query'

import { DataTable, TableCard } from '@/common/components/table'

import { FilterCard } from '@/common/components/feedback'

import { Select } from '@/common/components/select'

import { PageContainer } from '@/components/layout'

import { Button } from '@/components/ui/button'

import { QK } from '@/lib/query-keys'

import { rowIndexGetter } from '@/lib/utils'

import { listActiveCollegesForGeneralSettings, listSchAccountsPreceedings } from '@/services'

import type { SchAccountsPreceeding } from '@/types/scholarship'

import { collegeOption } from '../_lib/scholarship-filters'

import { AccountsPreceedingModal } from './AccountsPreceedingModal'



const COL_DEFS = {

  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<SchAccountsPreceeding>,

  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 90, flex: 0.7 } as ColDef<SchAccountsPreceeding>,

  title: { field: 'title', headerName: 'Cheque Title', minWidth: 140, flex: 1 } as ColDef<SchAccountsPreceeding>,

  chequeNo: { field: 'chequeNo', headerName: 'Cheque No', minWidth: 120, flex: 0.9 } as ColDef<SchAccountsPreceeding>,

  chequeDate: { field: 'chequeDate', headerName: 'Cheque Date', minWidth: 110, flex: 0.8 } as ColDef<SchAccountsPreceeding>,

  bankName: { field: 'bankName', headerName: 'Bank', minWidth: 120, flex: 0.9 } as ColDef<SchAccountsPreceeding>,

  actions: { headerName: 'Actions', minWidth: 86, width: 86, flex: 0 } as ColDef<SchAccountsPreceeding>,

}



function makeActionsRenderer(

  setEditing: (row: SchAccountsPreceeding | null) => void,

  setModalOpen: (open: boolean) => void,

) {

  return (p: ICellRendererParams<SchAccountsPreceeding>) => (

    <Button

      size="sm"

      variant="ghost"

      className="h-8 w-8 p-0"

      aria-label="Edit account proceeding"

      onClick={() => {

        setEditing(p.data ?? null)

        setModalOpen(true)

      }}

    >

      <PencilIcon className="h-3.5 w-3.5" />

    </Button>

  )

}



export default function AcountsPreceedingsPage() {

  const [collegeId, setCollegeId] = useState<number | null>(null)

  const [modalOpen, setModalOpen] = useState(false)

  const [editing, setEditing] = useState<SchAccountsPreceeding | null>(null)



  const { data: colleges = [] } = useQuery({

    queryKey: ['scholarship', 'colleges'],

    queryFn: listActiveCollegesForGeneralSettings,

  })



  const { data: rows = [], isLoading, refetch } = useQuery({

    queryKey: QK.schAccountsPreceedings.list(collegeId ?? undefined),

    queryFn: () => listSchAccountsPreceedings(collegeId ?? undefined),

    enabled: !!collegeId,

  })



  const collegeOptions = useMemo(() => colleges.map(collegeOption), [colleges])

  const selectedCollegeCode = colleges.find((c) => Number(c.collegeId) === collegeId)?.collegeCode



  const columnDefs = useMemo<ColDef<SchAccountsPreceeding>[]>(

    () => [

      COL_DEFS.siNo,

      COL_DEFS.collegeCode,

      COL_DEFS.title,

      COL_DEFS.chequeNo,

      COL_DEFS.chequeDate,

      COL_DEFS.bankName,

      { ...COL_DEFS.actions, cellRenderer: makeActionsRenderer(setEditing, setModalOpen) },

    ],

    [],

  )



  return (

    <PageContainer className="space-y-5">

      <FilterCard title="Account Proceedings" fieldMaxWidth="28rem">

        <Select

          label="College"

          value={collegeId ? String(collegeId) : null}

          onChange={(v) => setCollegeId(v ? Number(v) : null)}

          options={collegeOptions}

          placeholder="Select college"

          searchable

        />

      </FilterCard>



      {collegeId != null && (

      <TableCard withHeaderBorder={false}>

        <DataTable

          rowData={rows}

          columnDefs={columnDefs}

          loading={isLoading}

          pagination

          toolbar={{ search: true, searchPlaceholder: 'Search account proceedings…' }}

          toolbarTrailing={(

            <Button

              size="sm"

              className="h-[30px] px-3 text-[12px]"

              onClick={() => {

                setEditing(null)

                setModalOpen(true)

              }}

            >

              <PlusIcon className="h-3.5 w-3.5 mr-1.5" />

              Add Account Proceeding

            </Button>

          )}

        />

      </TableCard>

      )}



      <AccountsPreceedingModal

        open={modalOpen}

        onClose={() => {

          setModalOpen(false)

          setEditing(null)

        }}

        row={editing}

        collegeId={collegeId}

        collegeCode={selectedCollegeCode}

        onSaved={() => void refetch()}

      />

    </PageContainer>

  )

}


