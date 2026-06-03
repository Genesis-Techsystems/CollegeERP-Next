'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { QK } from '@/lib/query-keys'
import { APP_CONFIG } from '@/config/constants/app'
import { getFinanceEntityFilters } from '@/services'
import {
  distinctFinanceColleges,
  filterFinanceAccountTypes,
  filterFinanceEntities,
  filterFinanceYears,
} from './finance-filters'
import { useFinanceSessionIds } from './use-finance-session-ids'

export type FinanceCascadeOption = { value: number; label: string }

export function useFinanceCascade(options?: { withAccountType?: boolean }) {
  const withAccountType = options?.withAccountType ?? false
  const { organizationId, employeeId, contextLoading, contextReady } = useFinanceSessionIds()

  const { data: finRows = [], isLoading, isError, error } = useQuery({
    queryKey: QK.finEntityFilters(organizationId, employeeId),
    queryFn: () => getFinanceEntityFilters(organizationId, employeeId),
    enabled: contextReady,
    staleTime: APP_CONFIG.SESSION_STALE_TIME,
  })

  const [collegeId, setCollegeId] = useState(0)
  const [accountEntityId, setAccountEntityId] = useState(0)
  const [financialYearId, setFinancialYearId] = useState(0)
  const [accountTypeId, setAccountTypeId] = useState(0)

  const colleges = useMemo<FinanceCascadeOption[]>(() => {
    return distinctFinanceColleges(finRows).map((r) => ({
      value: Number(r.fk_college_id),
      label: r.college_code ?? `College ${r.fk_college_id}`,
    }))
  }, [finRows])

  const entities = useMemo<FinanceCascadeOption[]>(() => {
    if (!collegeId) return []
    return filterFinanceEntities(finRows, collegeId).map((r) => ({
      value: Number(r.pk_acc_entity_id),
      label: r.entity_code ?? `Entity ${r.pk_acc_entity_id}`,
    }))
  }, [finRows, collegeId])

  const years = useMemo<FinanceCascadeOption[]>(() => {
    if (!collegeId || !accountEntityId) return []
    return filterFinanceYears(finRows, collegeId, accountEntityId).map((r) => ({
      value: Number(r.pk_financial_year_id),
      label: r.financial_year ?? `Year ${r.pk_financial_year_id}`,
    }))
  }, [finRows, collegeId, accountEntityId])

  const accountTypes = useMemo<FinanceCascadeOption[]>(() => {
    if (!withAccountType || !collegeId || !accountEntityId || !financialYearId) return []
    return filterFinanceAccountTypes(finRows, collegeId, accountEntityId, financialYearId).map((r) => ({
      value: Number(r.pk_account_type_id),
      label: r.accounttype_name ?? `Type ${r.pk_account_type_id}`,
    }))
  }, [finRows, collegeId, accountEntityId, financialYearId, withAccountType])

  useEffect(() => {
    if (!collegeId && colleges.length) setCollegeId(colleges[0].value)
  }, [colleges, collegeId])

  useEffect(() => {
    if (collegeId && entities.length && !entities.some((e) => e.value === accountEntityId)) {
      setAccountEntityId(entities[0]?.value ?? 0)
    }
  }, [collegeId, entities, accountEntityId])

  useEffect(() => {
    if (accountEntityId && years.length && !years.some((y) => y.value === financialYearId)) {
      setFinancialYearId(years[0]?.value ?? 0)
    }
  }, [accountEntityId, years, financialYearId])

  useEffect(() => {
    if (withAccountType && financialYearId && accountTypes.length && !accountTypes.some((a) => a.value === accountTypeId)) {
      setAccountTypeId(accountTypes[0]?.value ?? 0)
    }
  }, [withAccountType, financialYearId, accountTypes, accountTypeId])

  const filtersValid = collegeId > 0 && accountEntityId > 0 && financialYearId > 0

  function toBudgetParams(extra: Record<string, string | number> = {}) {
    return {
      in_org_id: organizationId,
      in_college_id: collegeId,
      in_loginuser_empid: employeeId,
      in_loginuser_roleid: 0,
      in_financial_year_id: financialYearId,
      in_acc_entity_id: accountEntityId,
      in_fin_category_id: 0,
      in_fin_subcategory_id: 0,
      ...extra,
    }
  }

  function toBookParams(fromDate: string, toDate: string) {
    return {
      in_from_date: fromDate,
      in_to_date: toDate,
      in_college_id: collegeId,
      in_acc_entity_id: accountEntityId,
      in_financial_year_id: financialYearId,
      in_account_type_id: withAccountType ? accountTypeId : 0,
    }
  }

  return {
    isLoading: contextLoading || isLoading,
    isError,
    error,
    colleges,
    entities,
    years,
    accountTypes,
    collegeId,
    setCollegeId,
    accountEntityId,
    setAccountEntityId,
    financialYearId,
    setFinancialYearId,
    accountTypeId,
    setAccountTypeId,
    filtersValid,
    organizationId,
    employeeId,
    toBudgetParams,
    toBookParams,
  }
}
