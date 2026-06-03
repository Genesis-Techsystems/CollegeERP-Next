/** University payment wallet — Angular `UnivPaymentWallet` / `UnivPaymentWalletTransactions`. */

export interface UnivPaymentWallet {
  univPaymentWalletId: number
  universityId?: number
  universityCode?: string
  collegeId?: number
  collegeCode?: string
  studentId?: number
  studentCode?: string
  studentName?: string
  walletNumber?: string | null
  walletBalance?: number | null
  availableBalance?: number | null
  isActive?: boolean
  reason?: string | null
}

export interface UnivPaymentWalletTransaction {
  univPaymentWalletTransactionId: number
  univPaymentWalletId?: number
  universityCode?: string
  collegeCode?: string
  studentCode?: string
  studentName?: string
  transactionType?: string
  transactionTypeName?: string
  transactionNo?: string | null
  transactionMode?: string | null
  towards?: string | null
  amount?: number | null
  transactionDate?: string
  referenceNumber?: string
  description?: string
  isActive?: boolean
}

export type UnivWalletRechargePayload = {
  univPaymentWalletId: number
  amount: number
  collegeId?: number
  studentId?: number
}
