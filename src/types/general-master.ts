export interface GeneralMaster {
  generalMasterId: number
  generalMasterDisplayName: string
  generalMasterCode: string
  generalMasterDescription?: string
  isEditable?: boolean
  isActive: boolean
  generalDetailDTOList?: GeneralMasterDetail[]
}

export interface GeneralMasterDetail {
  generalDetailId?: number
  generalMasterId?: number
  generalDetailDisplayName: string
  generalDetailCode: string
  generalDetaildescription?: string
  isEditable?: boolean
  isActive?: boolean
}

