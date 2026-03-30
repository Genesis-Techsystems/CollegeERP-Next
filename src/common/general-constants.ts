/**
 * General constants.
 * Migrated from Angular: college_erp_angular_foundation_work/src/app/common/general-constants.ts
 */

export interface StatusColor {
  status: string
  colorCode: string
  id: number
}

export const GENERALCONSTANTS = {
  dataNotFound: 'No Data Found',

  statusColors: [
    { status: 'InProgress', colorCode: '#ffff4c', id: 628 },
    { status: 'Reject', colorCode: '#ff6c6c', id: 632 },
    { status: 'Evaluated', colorCode: '#bec8ff', id: 629 },
    { status: 'Finalised', colorCode: '#bec8ff', id: 631 },
    { status: 'Assigned', colorCode: '#6060ff', id: 627 },
    { status: 'New', colorCode: '#6060ff', id: 626 },
  ] as StatusColor[],
}
