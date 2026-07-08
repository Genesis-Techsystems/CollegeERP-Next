import { ENTITIES } from '@/config/constants/entities'
import type { GeneralSetting } from '@/types/general-setting'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listGeneralSettings(): Promise<GeneralSetting[]> {
  return domainList<GeneralSetting>(
    ENTITIES.GENERAL_SETTING.name,
    buildQuery({}, { field: 'createdDt', direction: 'DESC' }),
  )
}

export async function createGeneralSetting(
  data: Omit<GeneralSetting, 'generalSettingId'>,
): Promise<GeneralSetting> {
  return domainCreate<GeneralSetting>(ENTITIES.GENERAL_SETTING.name, data)
}

export async function updateGeneralSetting(
  generalSettingId: number,
  data: Partial<Omit<GeneralSetting, 'generalSettingId'>>,
): Promise<GeneralSetting> {
  const reason = data.reason?.trim() ? data.reason.trim() : null
  return domainUpdate<GeneralSetting>(
    ENTITIES.GENERAL_SETTING.name,
    ENTITIES.GENERAL_SETTING.pk,
    generalSettingId,
    { generalSettingId, ...data, reason },
  )
}
