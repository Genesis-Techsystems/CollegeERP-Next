'use client'

import { LibraryGridPage } from '../_components/LibraryGridPage'
import { LIB_COL } from '../_lib/library-columns'
import { QK } from '@/lib/query-keys'
import { listLibrarySettings } from '@/services'

export default function LibrarySettingsPage() {
  return (
    <LibraryGridPage
      title="Library Settings"
      queryKey={QK.library.settings()}
      queryFn={listLibrarySettings}
      columns={[
        LIB_COL.orgCode,
        LIB_COL.libraryCode,
        LIB_COL.settingName,
        LIB_COL.libSettingCatdetCode,
        LIB_COL.value,
        LIB_COL.isFine,
        LIB_COL.isActive,
      ]}
      searchPlaceholder="Search settings…"
    />
  )
}
