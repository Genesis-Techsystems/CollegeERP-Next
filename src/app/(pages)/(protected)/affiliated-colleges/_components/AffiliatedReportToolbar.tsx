'use client'

import { FileSpreadsheet, Printer } from 'lucide-react'
import { SearchInput } from '@/common/components/search'
import { Button } from '@/components/ui/button'

type AffiliatedReportToolbarProps = {
  search: string
  onSearchChange: (value: string) => void
  onExport: () => void
  onPrint: () => void
  onBack?: () => void
  showBack?: boolean
}

export function AffiliatedReportToolbar({
  search,
  onSearchChange,
  onExport,
  onPrint,
  onBack,
  showBack,
}: AffiliatedReportToolbarProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b px-4 py-3">
      <SearchInput
        value={search}
        onChange={onSearchChange}
        placeholder="Search"
        className="max-w-sm"
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="default" onClick={onExport}>
          <FileSpreadsheet className="h-4 w-4 mr-1.5" />
          Export Excel
        </Button>
        <Button type="button" variant="default" onClick={onPrint}>
          <Printer className="h-4 w-4 mr-1.5" />
          Print Report
        </Button>
        {showBack && onBack ? (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        ) : null}
      </div>
    </div>
  )
}
