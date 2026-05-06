'use client'

import { useEffect, useMemo, useState } from 'react'
import { PencilIcon, Trash2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { listGeneralDetailsByMasterId, saveGeneralMasterDetails } from '@/services'
import type { GeneralMaster, GeneralMasterDetail } from '@/types/general-master'

interface Props {
  open: boolean
  onClose: () => void
  row: GeneralMaster | null
  onSaved: () => void
}

const EMPTY_DETAIL: GeneralMasterDetail = {
  generalDetailDisplayName: '',
  generalDetailCode: '',
  generalDetaildescription: '',
  isEditable: false,
  isActive: true,
}

export default function GeneralMasterDetailsModal({ open, onClose, row, onSaved }: Readonly<Props>) {
  const [details, setDetails] = useState<GeneralMasterDetail[]>([])
  const [deletedDetails, setDeletedDetails] = useState<GeneralMasterDetail[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [form, setForm] = useState<GeneralMasterDetail>(EMPTY_DETAIL)
  const [isSaving, setIsSaving] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null)

  useEffect(() => {
    if (!open || !row) return
    setDeletedDetails([])
    setEditingIndex(null)
    setForm(EMPTY_DETAIL)
    setSubmitError(null)
    setSubmitSuccess(null)
    listGeneralDetailsByMasterId(row.generalMasterId)
      .then((rows) => setDetails(rows ?? []))
      .catch(() => setDetails(row.generalDetailDTOList ?? []))
  }, [open, row])

  const canAdd = useMemo(
    () => form.generalDetailDisplayName.trim() && form.generalDetailCode.trim(),
    [form.generalDetailDisplayName, form.generalDetailCode],
  )

  function addOrUpdateDetail() {
    setSubmitError(null)
    setSubmitSuccess(null)
    if (!canAdd) return
    const duplicate = details.some((item, index) => (
      index !== editingIndex
      && (
        item.generalDetailDisplayName.toLowerCase() === form.generalDetailDisplayName.toLowerCase()
        || item.generalDetailCode.toLowerCase() === form.generalDetailCode.toLowerCase()
      )
    ))
    if (duplicate) {
      setSubmitError('Already details exist with the same name or code.')
      return
    }

    if (editingIndex === null) {
      setDetails((prev) => [
        ...prev,
        {
          ...form,
          generalDetailCode: form.generalDetailCode.toUpperCase(),
        },
      ])
    } else {
      setDetails((prev) => prev.map((item, index) => (
        index === editingIndex
          ? { ...form, generalDetailCode: item.generalDetailCode, generalDetailId: item.generalDetailId }
          : item
      )))
    }

    setEditingIndex(null)
    setForm(EMPTY_DETAIL)
  }

  function editDetail(item: GeneralMasterDetail, index: number) {
    setEditingIndex(index)
    setForm({ ...item })
  }

  function deleteDetail(item: GeneralMasterDetail, index: number) {
    setDetails((prev) => prev.filter((_, i) => i !== index))
    setDeletedDetails((prev) => [...prev, { ...item, isActive: false }])
    if (editingIndex === index) {
      setEditingIndex(null)
      setForm(EMPTY_DETAIL)
    }
  }

  async function saveAll() {
    if (!row) return
    setSubmitError(null)
    setSubmitSuccess(null)
    setIsSaving(true)
    try {
      await saveGeneralMasterDetails(row, [...details, ...deletedDetails])
      setSubmitSuccess('General details saved successfully.')
      onSaved()
      globalThis.setTimeout(() => {
        onClose()
      }, 700)
    } catch (error: unknown) {
      setSubmitError(error instanceof Error ? error.message : 'Failed to save general details.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent className="sm:max-w-6xl max-h-[90vh] overflow-y-auto text-sm">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-sm font-semibold leading-none text-[hsl(var(--primary))]">
            Add / Edit General Details
          </DialogTitle>
          <p className="text-xs text-slate-600 mt-1">General Master: {row?.generalMasterDisplayName ?? '-'}</p>
        </DialogHeader>

        <div className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end">
            <div className="md:col-span-4">
              <Label className="text-xs">General Name *</Label>
              <Input value={form.generalDetailDisplayName} onChange={(e) => setForm((prev) => ({ ...prev, generalDetailDisplayName: e.target.value }))} />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">General Code *</Label>
              <Input
                value={form.generalDetailCode}
                disabled={editingIndex !== null}
                onChange={(e) => setForm((prev) => ({ ...prev, generalDetailCode: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Description</Label>
              <Input value={form.generalDetaildescription ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, generalDetaildescription: e.target.value }))} />
            </div>
            <div className="md:col-span-1 flex items-center gap-2 pb-2">
              <Checkbox checked={form.isEditable ?? false} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isEditable: Boolean(checked) }))} />
              <Label className="text-xs">Editable</Label>
            </div>
            <div className="md:col-span-1 flex items-center gap-2 pb-2">
              <Checkbox checked={form.isActive ?? true} onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: Boolean(checked) }))} />
              <Label className="text-xs">Active</Label>
            </div>
            <div className="md:col-span-2">
              <Button className="w-full" onClick={addOrUpdateDetail} disabled={!canAdd}>{editingIndex === null ? 'Add' : 'Update'}</Button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-1.5 text-left">SI.No</th>
                  <th className="px-2 py-1.5 text-left">General Details Name</th>
                  <th className="px-2 py-1.5 text-left">General Details Code</th>
                  <th className="px-2 py-1.5 text-left">Description</th>
                  <th className="px-2 py-1.5 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {details.map((item, index) => (
                  <tr key={`${item.generalDetailCode}-${index}`} className="border-t border-slate-200">
                    <td className="px-2 py-1.5">{index + 1}</td>
                    <td className="px-2 py-1.5">{item.generalDetailDisplayName}</td>
                    <td className="px-2 py-1.5">{item.generalDetailCode}</td>
                    <td className="px-2 py-1.5">{item.generalDetaildescription ?? '-'}</td>
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => editDetail(item, index)} aria-label="Edit detail">
                          <PencilIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-red-600 hover:text-red-700" onClick={() => deleteDetail(item, index)} aria-label="Delete detail">
                          <Trash2Icon className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {submitError && (
          <p className="text-sm text-red-600 rounded bg-red-50 px-3 py-2">{submitError}</p>
        )}
        {submitSuccess && (
          <p className="text-sm text-green-700 rounded bg-green-50 px-3 py-2">{submitSuccess}</p>
        )}

        <DialogFooter className="pt-2">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Close</Button>
          <Button onClick={saveAll} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save'}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

