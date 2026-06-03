import type { GeneralMaster, GeneralMasterDetail } from '@/types/general-master'
import { fetchDetails, postDetails, putDetails } from '../crud'

export async function listGeneralMasters(): Promise<GeneralMaster[]> {
  // Angular source uses `generalmasters?isActive=true` (non-domain endpoint).
  return fetchDetails<GeneralMaster[]>('generalmasters', { isActive: 'true' })
}

export async function createGeneralMaster(
  data: Omit<GeneralMaster, 'generalMasterId'>,
): Promise<GeneralMaster> {
  return postDetails<GeneralMaster>('generalmasters', data)
}

export async function updateGeneralMaster(
  generalMasterId: number,
  data: Partial<Omit<GeneralMaster, 'generalMasterId'>>,
): Promise<GeneralMaster> {
  // Angular updates via PUT `generalmasters` with object containing id.
  return putDetails<GeneralMaster>('generalmasters', { generalMasterId, ...data })
}

export async function listGeneralDetailsByMasterId(generalMasterId: number): Promise<GeneralMasterDetail[]> {
  const rows = await listGeneralMasters()
  const master = rows.find((item) => item.generalMasterId === generalMasterId)
  return master?.generalDetailDTOList ?? []
}

export async function saveGeneralMasterDetails(
  master: GeneralMaster,
  details: GeneralMasterDetail[],
): Promise<GeneralMaster> {
  return updateGeneralMaster(master.generalMasterId, {
    ...master,
    generalDetailDTOList: details.map((item) => ({
      ...item,
      generalMasterId: master.generalMasterId,
      generalDetailCode: String(item.generalDetailCode ?? '').toUpperCase(),
      isActive: item.isActive ?? true,
      isEditable: item.isEditable ?? false,
    })),
  })
}

