/**
 * Print / PDF configuration constants.
 * Migrated from Angular: college_erp_angular_foundation_work/src/app/common/print-config.ts
 */

export type PaperSizeName = 'A4' | 'LETTER'
export type Orientation = 'portrait' | 'landscape'

export interface PaperDimensions {
  /** Width in points (1 pt = 1/72 inch) */
  width: number
  /** Height in points */
  height: number
}

export const PRINTCONFIG = {
  paperSizes: {
    A4: { width: 595.28, height: 841.89 } as PaperDimensions,
    LETTER: { width: 612, height: 792 } as PaperDimensions,
  },
  datatables: {
    paperSize: 'A4' as PaperSizeName,
    orientation: 'landscape' as Orientation,
  },
}
