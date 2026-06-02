'use client'

import { useState } from 'react'
import { DatePicker } from '@/common/components/date-picker'
import { Button } from '@/components/ui/button'
import { LibraryScreenShell } from '../_components/LibraryScreenShell'

/** Library fine collection — Angular filter + day-wise collection table. */
export default function LibraryFineCollectionPage() {
  const [collectedDate, setCollectedDate] = useState<Date | undefined>(undefined)

  return (
    <LibraryScreenShell title="Library Fine Collection">
      <div className="app-card space-y-4 p-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full max-w-[200px]">
            <DatePicker
              label="Fine Collected Date"
              value={collectedDate}
              onChange={setCollectedDate}
            />
          </div>
          <Button type="button" size="sm" className="h-9 px-4">
            Get List
          </Button>
        </div>
        <p className="text-sm text-muted-foreground">
          Fine collection report grid will load from the library fee collection API when filters are applied.
        </p>
      </div>
    </LibraryScreenShell>
  )
}
