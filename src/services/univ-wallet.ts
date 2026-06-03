import { PAYMENT_GATEWAY_API } from '@/config/constants/api'
import { ENTITIES } from '@/config/constants/entities'
import type {
  UnivPaymentWallet,
  UnivPaymentWalletTransaction,
  UnivWalletRechargePayload,
} from '@/types/univ-wallet'
import { buildQuery, domainCreate, domainList, domainUpdate, postDetails } from './crud'

const W = ENTITIES.UNIV_PAYMENT_WALLET
const WT = ENTITIES.UNIV_PAYMENT_WALLET_TXN

const sortDesc = { field: 'createdDt', direction: 'DESC' as const }

export async function listUnivPaymentWallets(): Promise<UnivPaymentWallet[]> {
  return domainList<UnivPaymentWallet>(W.name, buildQuery({}, sortDesc))
}

export async function listUnivPaymentWalletsByCollege(collegeId: number): Promise<UnivPaymentWallet[]> {
  if (!collegeId) return []
  return domainList<UnivPaymentWallet>(
    W.name,
    buildQuery({ 'College.collegeId': collegeId, isActive: true }, sortDesc),
  )
}

export async function getUnivPaymentWalletForStudent(studentId: number): Promise<UnivPaymentWallet | null> {
  if (!studentId) return null
  const rows = await domainList<UnivPaymentWallet>(
    W.name,
    buildQuery({ 'Student.studentId': studentId, isActive: true }, sortDesc),
  )
  return rows[0] ?? null
}

export async function createUnivPaymentWallet(
  data: Partial<UnivPaymentWallet>,
): Promise<UnivPaymentWallet> {
  return domainCreate<UnivPaymentWallet>(W.name, data)
}

export async function updateUnivPaymentWallet(
  id: number,
  data: Partial<UnivPaymentWallet>,
): Promise<UnivPaymentWallet> {
  return domainUpdate<UnivPaymentWallet>(W.name, W.pk, id, data)
}

export async function listUnivPaymentWalletTransactions(
  walletId?: number,
): Promise<UnivPaymentWalletTransaction[]> {
  if (walletId) {
    return domainList<UnivPaymentWalletTransaction>(
      WT.name,
      buildQuery({ 'UnivPaymentWallet.univPaymentWalletId': walletId }, sortDesc),
    )
  }
  return domainList<UnivPaymentWalletTransaction>(WT.name, buildQuery({}, sortDesc))
}

export async function initiateUnivWalletRecharge(
  payload: UnivWalletRechargePayload,
): Promise<unknown> {
  return postDetails(PAYMENT_GATEWAY_API.PAYPHI_UNIV_INITIATE, payload)
}
