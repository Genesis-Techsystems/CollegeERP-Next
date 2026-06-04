'use client'

import { useEffect, useMemo } from 'react'
import { Controller, useForm, type Resolver } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { FormModal } from '@/common/components/feedback'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, type SelectOption } from '@/common/components/select'
import { GM_CODES } from '@/config/constants/ui'
import {
  createInvItem,
  listGeneralDetailsByMaster,
  listInvBrands,
  listInvItemCategories,
  listInvItemSubCategories,
  listInvSuppliersMaster,
  listOrganizations,
  updateInvItem,
} from '@/services'
import { QK } from '@/lib/query-keys'
import type { InvItem } from '@/types/inventory'
import { getInventoryOrganizationId } from '../_lib/inventory-org'

const schema = z.object({
  organizationId: z.coerce.number().min(1, 'Organization is required'),
  itemName: z.string().min(1, 'Item name is required'),
  itemCode: z.string().min(1, 'Item code is required'),
  itemAliasname: z.string().optional(),
  itemTypeCatdetId: z.coerce.number().optional(),
  itemCategoryId: z.coerce.number().min(1, 'Item category is required'),
  itemSubcategoryId: z.coerce.number().optional(),
  brandmasterId: z.coerce.number().optional(),
  make: z.string().optional(),
  model: z.string().optional(),
  supplierId: z.coerce.number().optional(),
  isReqTracking: z.boolean(),
  isActive: z.boolean(),
  reason: z.string().optional(),
})
type FormValues = z.infer<typeof schema>

function getDefaults(edit?: InvItem | null): FormValues {
  const defaultOrgId = getInventoryOrganizationId()
  return {
    organizationId: edit?.organizationId ?? (defaultOrgId > 0 ? defaultOrgId : 0),
    itemName: edit?.itemName ?? '',
    itemCode: edit?.itemCode ?? '',
    itemAliasname: edit?.itemAliasname ?? '',
    itemTypeCatdetId: edit?.itemTypeCatdetId,
    itemCategoryId: edit?.itemCategoryId ?? 0,
    itemSubcategoryId: edit?.itemSubcategoryId,
    brandmasterId: edit?.brandmasterId,
    make: edit?.make ?? '',
    model: edit?.model ?? '',
    supplierId: edit?.supplierId,
    isReqTracking: edit?.isReqTracking ?? false,
    isActive: edit?.isActive ?? true,
    reason: edit?.reason ?? 'active',
  }
}

interface Props {
  open: boolean
  onClose: () => void
  editData: InvItem | null
  onSaved: () => void
}

export default function ItemMasterModal({ open, onClose, editData, onSaved }: Props) {
  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as Resolver<FormValues>,
    defaultValues: getDefaults(),
  })

  const organizationId = watch('organizationId')
  const selectedCategoryId = watch('itemCategoryId')
  const itemSubcategoryId = watch('itemSubcategoryId')
  const isActive = watch('isActive')

  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['Organizations', 'list'],
    queryFn: listOrganizations,
    enabled: open,
  })

  const { data: itemTypes = [], isLoading: itemTypesLoading } = useQuery({
    queryKey: ['GeneralDetail', GM_CODES.ITEM_TYPE],
    queryFn: () => listGeneralDetailsByMaster(GM_CODES.ITEM_TYPE),
    enabled: open,
  })

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: QK.invItemCategories.list(),
    queryFn: listInvItemCategories,
    enabled: open,
  })

  const { data: subCategories = [], isLoading: subCategoriesLoading } = useQuery({
    queryKey: QK.invItemSubCategories.list(),
    queryFn: listInvItemSubCategories,
    enabled: open,
  })

  const { data: brands = [], isLoading: brandsLoading } = useQuery({
    queryKey: QK.invBrands.list(),
    queryFn: listInvBrands,
    enabled: open,
  })

  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: QK.invSuppliersMaster.list(),
    queryFn: listInvSuppliersMaster,
    enabled: open,
  })

  const organizationOptions: SelectOption[] = useMemo(
    () => organizations
      .filter((o) => o.isActive !== false)
      .map((o) => ({
        value: String(o.organizationId),
        label: o.orgCode ?? o.orgName ?? String(o.organizationId),
      })),
    [organizations],
  )

  const itemTypeOptions: SelectOption[] = useMemo(
    () => itemTypes.map((t) => ({
      value: String(t.generalDetailId),
      label: String(
        t.generalDetailDisplayName
          ?? t.generalDetailName
          ?? t.generalDetailCode
          ?? t.generalDetailId,
      ),
    })),
    [itemTypes],
  )

  const categoryOptions: SelectOption[] = useMemo(
    () => categories.map((c) => ({
      value: String(c.itemCategoryId),
      label: c.categoryName ?? c.categoryCode ?? String(c.itemCategoryId),
    })),
    [categories],
  )

  const subCategoryOptions: SelectOption[] = useMemo(
    () => subCategories
      .filter((s) => !selectedCategoryId || s.itemCategoryId === selectedCategoryId)
      .map((s) => ({
        value: String(s.itemSubcategoryId),
        label: s.subcategoryName ?? s.subcategoryCode ?? String(s.itemSubcategoryId),
      })),
    [subCategories, selectedCategoryId],
  )

  const brandOptions: SelectOption[] = useMemo(
    () => brands.map((b) => ({
      value: String(b.brandmasterId),
      label: b.brandName ?? b.brandCode ?? String(b.brandmasterId),
    })),
    [brands],
  )

  const supplierOptions: SelectOption[] = useMemo(
    () => suppliers.map((s) => ({
      value: String(s.supplierId),
      label: s.supplierName ?? String(s.supplierId),
    })),
    [suppliers],
  )

  useEffect(() => {
    if (!open) return
    reset(getDefaults(editData))
  }, [open, editData, reset])

  useEffect(() => {
    if (!open || editData) return
    if (organizationId > 0) return
    const defaultOrgId = getInventoryOrganizationId()
    if (defaultOrgId > 0) setValue('organizationId', defaultOrgId)
  }, [open, editData, organizationId, setValue])

  useEffect(() => {
    if (!itemSubcategoryId || !selectedCategoryId) return
    const match = subCategories.find((s) => s.itemSubcategoryId === itemSubcategoryId)
    if (match && match.itemCategoryId !== selectedCategoryId) {
      setValue('itemSubcategoryId', undefined)
    }
  }, [selectedCategoryId, subCategories, itemSubcategoryId, setValue])

  async function onSubmit(values: FormValues) {
    const payload: Partial<InvItem> = {
      organizationId: values.organizationId,
      itemCode: values.itemCode.trim(),
      itemName: values.itemName.trim(),
      itemAliasname: values.itemAliasname?.trim() || undefined,
      itemTypeCatdetId: values.itemTypeCatdetId,
      itemCategoryId: values.itemCategoryId,
      itemSubcategoryId: values.itemSubcategoryId,
      brandmasterId: values.brandmasterId,
      make: values.make?.trim() || undefined,
      model: values.model?.trim() || undefined,
      supplierId: values.supplierId,
      isReqTracking: values.isReqTracking,
      isActive: values.isActive,
      reason: values.isActive ? 'active' : (values.reason?.trim() || 'inactive'),
    }
    if (editData) {
      await updateInvItem(editData.itemId, payload)
    } else {
      await createInvItem(payload)
    }
    onSaved()
    onClose()
  }

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={editData ? 'Edit Master Item' : 'Add Master Item'}
      titleClassName="text-[hsl(var(--primary))] text-base font-semibold"
      size="lg"
      isSubmitting={isSubmitting}
      submitLabel="Save"
      cancelLabel="Close"
      formClassName="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        void handleSubmit(onSubmit)()
      }}
    >
      <Controller
        name="organizationId"
        control={control}
        render={({ field }) => (
          <Select
            label="Organization *"
            value={field.value > 0 ? String(field.value) : null}
            onChange={(v) => field.onChange(v ? Number(v) : 0)}
            options={organizationOptions}
            placeholder="Select organization"
            isLoading={orgsLoading}
            searchable
            error={errors.organizationId?.message}
          />
        )}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-0.5 sm:col-span-2">
          <Label className="text-xs">Item Name *</Label>
          <Input className="h-8 text-xs" {...register('itemName')} />
          {errors.itemName && <p className="text-xs text-red-500">{errors.itemName.message}</p>}
        </div>
        <div className="space-y-0.5">
          <Label className="text-xs">Item Code *</Label>
          <Input className="h-8 text-xs" {...register('itemCode')} />
          {errors.itemCode && <p className="text-xs text-red-500">{errors.itemCode.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-0.5">
          <Label className="text-xs">Item Alias Name</Label>
          <Input className="h-8 text-xs" {...register('itemAliasname')} />
        </div>
        <Controller
          name="itemTypeCatdetId"
          control={control}
          render={({ field }) => (
            <Select
              label="Item Type"
              value={field.value != null ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={itemTypeOptions}
              placeholder="Select item type"
              isLoading={itemTypesLoading}
              searchable
              clearable
            />
          )}
        />
        <Controller
          name="itemCategoryId"
          control={control}
          render={({ field }) => (
            <Select
              label="Item Category *"
              value={field.value > 0 ? String(field.value) : null}
              onChange={(v) => {
                field.onChange(v ? Number(v) : 0)
                setValue('itemSubcategoryId', undefined)
              }}
              options={categoryOptions}
              placeholder="Select category"
              isLoading={categoriesLoading}
              searchable
              error={errors.itemCategoryId?.message}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Controller
          name="itemSubcategoryId"
          control={control}
          render={({ field }) => (
            <Select
              label="Item Sub Category"
              value={field.value != null ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={subCategoryOptions}
              placeholder="Select sub category"
              isLoading={subCategoriesLoading}
              searchable
              clearable
              disabled={!selectedCategoryId}
            />
          )}
        />
        <Controller
          name="brandmasterId"
          control={control}
          render={({ field }) => (
            <Select
              label="Brand"
              value={field.value != null ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={brandOptions}
              placeholder="Select brand"
              isLoading={brandsLoading}
              searchable
              clearable
            />
          )}
        />
        <div className="space-y-0.5">
          <Label className="text-xs">Make</Label>
          <Input className="h-8 text-xs" {...register('make')} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-0.5">
          <Label className="text-xs">Model</Label>
          <Input className="h-8 text-xs" {...register('model')} />
        </div>
        <Controller
          name="supplierId"
          control={control}
          render={({ field }) => (
            <Select
              label="Supplier"
              value={field.value != null ? String(field.value) : null}
              onChange={(v) => field.onChange(v ? Number(v) : undefined)}
              options={supplierOptions}
              placeholder="Select supplier"
              isLoading={suppliersLoading}
              searchable
              clearable
            />
          )}
        />
        <Controller
          name="isReqTracking"
          control={control}
          render={({ field }) => (
            <div className="flex h-full items-end pb-2">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="isReqTracking"
                  checked={field.value}
                  onCheckedChange={(checked) => field.onChange(Boolean(checked))}
                />
                <Label htmlFor="isReqTracking" className="text-xs font-normal cursor-pointer">
                  Is Trackable
                </Label>
              </div>
            </div>
          )}
        />
      </div>

      <Controller
        name="isActive"
        control={control}
        render={({ field }) => (
          <div className="flex items-center gap-2">
            <Checkbox
              id="itemIsActive"
              checked={field.value}
              onCheckedChange={field.onChange}
            />
            <Label htmlFor="itemIsActive" className="text-xs font-normal cursor-pointer">
              Active
            </Label>
          </div>
        )}
      />

      {!isActive && (
        <div className="space-y-0.5">
          <Label className="text-xs">Reason</Label>
          <Input className="h-8 text-xs" {...register('reason')} />
          {errors.reason && <p className="text-xs text-red-500">{errors.reason.message}</p>}
        </div>
      )}
    </FormModal>
  )
}
