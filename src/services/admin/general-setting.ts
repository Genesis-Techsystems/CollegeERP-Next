import { ENTITIES } from '@/config/constants/entities'
import type { GeneralSetting } from '@/types/general-setting'
import { buildQuery, domainCreate, domainList, domainUpdate } from '../crud'

export async function listGeneralSettings(): Promise<GeneralSetting[]> {
  return domainList<GeneralSetting>(
    ENTITIES.GENERAL_SETTING.name,
    buildQuery({ isActive: true }),
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
  return domainUpdate<GeneralSetting>(
    ENTITIES.GENERAL_SETTING.name,
    ENTITIES.GENERAL_SETTING.pk,
    generalSettingId,
    data,
  )
}
