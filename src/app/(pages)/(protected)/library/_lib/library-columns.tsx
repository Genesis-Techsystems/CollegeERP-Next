import type { ColDef, ICellRendererParams } from 'ag-grid-community'
import { StatusBadge } from '@/common/components/data-display'
import type { LibraryRow } from '@/services'

function statusRenderer(p: ICellRendererParams<LibraryRow>) {
  const active = p.data?.isActive
  if (active === undefined) return null
  return <StatusBadge status={active !== false} />
}

function textCol(field: string, headerName: string, minWidth = 120): ColDef<LibraryRow> {
  return { field, headerName, minWidth }
}

export const LIB_COL = {
  title: textCol('title', 'Title', 180),
  bookTitle: textCol('bookTitle', 'Book Title', 180),
  libraryCode: textCol('libraryCode', 'Library', 100),
  noofcopies: textCol('noofcopies', 'Copies', 90),
  availableCopies: textCol('availableCopies', 'Available', 100),
  issuedCopies: textCol('issuedCopies', 'Issued', 90),
  periodicalName: textCol('periodicalName', 'Periodical', 160),
  periodicalCode: textCol('periodicalCode', 'Code', 100),
  accessionno: textCol('accessionno', 'Accession No', 120),
  bookAuthor: textCol('bookAuthor', 'Author', 140),
  shelveName: textCol('shelveName', 'Shelve', 100),
  bookPosition: textCol('bookPosition', 'Position', 90),
  barcode: textCol('barcode', 'Barcode', 120),
  availabilityStatus: textCol('availabilityStatus', 'Status', 110),
  memberCode: textCol('memberCode', 'Member Code', 110),
  libMember: textCol('libMember', 'Member', 160),
  issueTodate: textCol('issueTodate', 'Due Date', 110),
  delyDays: textCol('delyDays', 'Delay Days', 100),
  bookregTypeCode: textCol('bookregTypeCode', 'Reg Type', 100),
  orgCode: textCol('orgCode', 'Org', 90),
  settingName: textCol('settingName', 'Setting', 140),
  libSettingCatdetCode: textCol('libSettingCatdetCode', 'Category', 110),
  value: textCol('value', 'Value', 90),
  isFine: textCol('isFine', 'Fine', 70),
  isActive: {
    field: 'isActive',
    headerName: 'Status',
    minWidth: 100,
    flex: 0,
    cellRenderer: statusRenderer,
  } as ColDef<LibraryRow>,
}
