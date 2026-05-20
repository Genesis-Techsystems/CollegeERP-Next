/**
 * Base types shared by all domain entities.
 * Entity interfaces extend DomainEntity; form interfaces extend DomainFormBase.
 */

/** Common audit + soft-delete fields present on every Spring Boot entity. */
export interface DomainEntity {
  isActive: boolean
  reason?: string
  createdDt?: string
  updatedDt?: string
}

/** Common isActive + reason fields required in every CRUD form. */
export interface DomainFormBase {
  isActive: boolean
  reason: string
}

/** Generic foreign-key reference — id, display name, optional code. */
export interface FkRef {
  id: number
  name: string
  code?: string
}
