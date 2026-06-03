'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { ColDef } from 'ag-grid-community'
import { DataTable, TableCard } from '@/common/components/table'
import { EmptyState } from '@/common/components/feedback'
import { SearchInput } from '@/common/components/search'
import { PageContainer } from '@/components/layout'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useSessionContext } from '@/context/SessionContext'
import { getErrorMessage } from '@/lib/errors'
import { QK } from '@/lib/query-keys'
import { toastError } from '@/lib/toast'
import { rowIndexGetter } from '@/lib/utils'
import {
  listEmployeeLibraryMemberships,
  listLibraryMemberships,
  listStudentsWithoutLibraryMembership,
  searchLibraryMembers,
} from '@/services'
import type { LibraryMembership } from '@/types/library'
import { NewMembershipPanel } from './NewMembershipPanel'

type MembershipTab = 'list' | 'new'
type SearchMode = 'member' | 'all' | 'students' | 'employees'

const TAB_TRIGGER_CLASS =
  'rounded-none border-b-2 border-transparent px-4 py-2 text-[13px] data-[state=active]:border-[#c9a227] data-[state=active]:bg-[#fff8e1] data-[state=active]:text-[#1e3a5f] data-[state=active]:shadow-none'

const COL_DEFS = {
  siNo: { headerName: 'SI.No', valueGetter: rowIndexGetter, width: 70, flex: 0 } as ColDef<LibraryMembership>,
  membershipNo: { field: 'membershipNo', headerName: 'Membership Id', minWidth: 120 } as ColDef<LibraryMembership>,
  memberName: { field: 'memberName', headerName: 'Name', minWidth: 160 } as ColDef<LibraryMembership>,
  memberType: { field: 'memberType', headerName: 'Type', minWidth: 100 } as ColDef<LibraryMembership>,
  hallticketNumber: { field: 'hallticketNumber', headerName: 'Hall Ticket', minWidth: 110 } as ColDef<LibraryMembership>,
  rollNumber: { field: 'rollNumber', headerName: 'Roll No', minWidth: 100 } as ColDef<LibraryMembership>,
  empNumber: { field: 'empNumber', headerName: 'Emp No', minWidth: 100 } as ColDef<LibraryMembership>,
  collegeCode: { field: 'collegeCode', headerName: 'College', minWidth: 90 } as ColDef<LibraryMembership>,
  libraryName: { field: 'libraryName', headerName: 'Library', minWidth: 120 } as ColDef<LibraryMembership>,
}

async function loadMembershipRows(
  mode: SearchMode,
  searchText: string,
  collegeId: number,
): Promise<LibraryMembership[]> {
  if (mode === 'member') {
    const term = searchText.trim()
    if (term.length < 2) return []
    return searchLibraryMembers(term, collegeId || undefined)
  }
  if (mode === 'students') return listStudentsWithoutLibraryMembership(collegeId || undefined)
  if (mode === 'employees') return listEmployeeLibraryMemberships(collegeId || undefined)
  return listLibraryMemberships()
}

export function MembershipPage() {
  const { user } = useSessionContext()
  const collegeId = user?.collegeId ?? 0

  const [activeTab, setActiveTab] = useState<MembershipTab>('list')
  const [searchMode, setSearchMode] = useState<SearchMode>('member')
  const [searchText, setSearchText] = useState('')
  const [generateToken, setGenerateToken] = useState(0)

  const memberReady = searchMode !== 'member' || searchText.trim().length >= 2
  const queryEnabled = activeTab === 'list' && generateToken > 0 && memberReady

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: [...QK.library.membership(searchMode, searchText, collegeId), generateToken],
    queryFn: () => loadMembershipRows(searchMode, searchText, collegeId),
    enabled: queryEnabled,
  })

  const columnDefs = useMemo<ColDef<LibraryMembership>[]>(
    () => [
      COL_DEFS.siNo,
      COL_DEFS.membershipNo,
      COL_DEFS.memberName,
      COL_DEFS.memberType,
      COL_DEFS.hallticketNumber,
      COL_DEFS.rollNumber,
      COL_DEFS.empNumber,
      COL_DEFS.collegeCode,
      COL_DEFS.libraryName,
    ],
    [],
  )

  function handleGenerate() {
    if (searchMode === 'member' && searchText.trim().length < 2) {
      toastError('Type at least 2 characters of membership id or name.')
      return
    }
    setGenerateToken((t) => t + 1)
  }

  const showResults = generateToken > 0 && memberReady

  return (
    <PageContainer className="space-y-5">
      <div className="app-card overflow-hidden px-4 py-3">
        <h1 className="text-[15px] font-semibold leading-tight text-[hsl(var(--card-title))]">
          Membership
        </h1>
      </div>

      <div className="app-card overflow-hidden p-4">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as MembershipTab)}>
          <TabsList className="mb-4 h-auto w-full justify-start rounded-none border-b border-slate-200 bg-transparent p-0">
            <TabsTrigger value="list" className={TAB_TRIGGER_CLASS}>
              Membership List
            </TabsTrigger>
            <TabsTrigger value="new" className={TAB_TRIGGER_CLASS}>
              New Membership
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="mt-0 space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-3">
                <RadioGroup
                  value={searchMode}
                  onValueChange={(v) => {
                    setSearchMode(v as SearchMode)
                    setGenerateToken(0)
                    setSearchText('')
                  }}
                  className="flex flex-wrap gap-x-6 gap-y-2"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="member" id="lib-mem-search-member" />
                    <Label htmlFor="lib-mem-search-member" className="text-[13px] font-normal">
                      Search By Member
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="all" id="lib-mem-all" />
                    <Label htmlFor="lib-mem-all" className="text-[13px] font-normal">
                      All Members
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="students" id="lib-mem-students" />
                    <Label htmlFor="lib-mem-students" className="text-[13px] font-normal">
                      Student List
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="employees" id="lib-mem-employees" />
                    <Label htmlFor="lib-mem-employees" className="text-[13px] font-normal">
                      Employee List
                    </Label>
                  </div>
                </RadioGroup>

                {searchMode === 'member' ? (
                  <div className="max-w-md">
                    <SearchInput
                      value={searchText}
                      onChange={setSearchText}
                      placeholder="Membership Id or Name"
                      className="w-full"
                    />
                  </div>
                ) : null}
              </div>

              <Button
                type="button"
                size="sm"
                className="h-9 shrink-0 px-4"
                onClick={handleGenerate}
                disabled={isLoading}
              >
                Generate Membership
              </Button>
            </div>

            {showResults && isError ? (
              <EmptyState
                title="Could not load memberships"
                description={getErrorMessage(error)}
                action={{ label: 'Retry', onClick: () => void refetch() }}
              />
            ) : showResults ? (
              <TableCard withHeaderBorder={false}>
                <DataTable
                  rowData={rows}
                  columnDefs={columnDefs}
                  loading={isLoading}
                  pagination
                  toolbar={{
                    search: true,
                    searchPlaceholder: 'Search in list…',
                    pdfDocumentTitle: 'Library Membership',
                  }}
                />
                {!isLoading && rows.length === 0 ? (
                  <p className="border-t px-4 py-6 text-center text-sm text-muted-foreground">
                    No memberships found for your search.
                  </p>
                ) : null}
              </TableCard>
            ) : null}
          </TabsContent>

          <TabsContent value="new" className="mt-0">
            <NewMembershipPanel
              onSaved={() => {
                setGenerateToken((t) => t + 1)
                void refetch()
              }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PageContainer>
  )
}
