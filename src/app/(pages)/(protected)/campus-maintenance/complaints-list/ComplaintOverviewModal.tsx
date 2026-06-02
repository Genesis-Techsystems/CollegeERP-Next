'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CampusIssue } from '@/types/campus-maintenance'
import { updateCampusIssue } from '@/services/campus-maintenance'

interface Props {
  open: boolean
  onClose: () => void
  issue: CampusIssue | null
  onSaved: () => void
}

function Row({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <span className="font-medium text-muted-foreground text-xs col-span-1">{label}</span>
      <span className="col-span-2 text-sm">{value ?? '—'}</span>
    </div>
  )
}

export default function ComplaintOverviewModal({ open, onClose, issue, onSaved }: Props) {
  const [statusComments, setStatusComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (issue) setStatusComments(issue.statusComments ?? '')
    setError(null)
  }, [issue, open])

  async function handleSave() {
    if (!issue) return
    setSaving(true)
    setError(null)
    try {
      await updateCampusIssue(issue.managementIssueId, { statusComments })
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!issue) return null

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-[hsl(var(--primary))]">Complaint Overview</DialogTitle>
        </DialogHeader>

        <div className="space-y-2.5 py-2">
          <Row label="Raised By" value={issue.raisedEmpName} />
          <Row label="Employee No" value={issue.raisedEmpNumber} />
          <Row label="College" value={issue.collegeName} />
          {issue.deptName && <Row label="Department" value={issue.deptName} />}
          {issue.issueInroomName && <Row label="Room" value={issue.issueInroomName} />}
          <Row label="Issue Title" value={issue.issueTitle} />
          {issue.issuepriorityCatDisplayName && (
            <Row label="Priority" value={issue.issuepriorityCatDisplayName} />
          )}
          <Row label="Description" value={issue.issueDescription} />
          {issue.wfStatusComments && (
            <Row label="Workflow Comments" value={issue.wfStatusComments} />
          )}
          {issue.closedEmpName && <Row label="Closed By" value={issue.closedEmpName} />}
          {issue.closingComments && (
            <Row label="Closing Comments" value={issue.closingComments} />
          )}

          <div className="space-y-1 pt-1">
            <Label className="text-xs">Status Comments</Label>
            <Textarea
              value={statusComments}
              onChange={(e) => setStatusComments(e.target.value)}
              rows={3}
              placeholder="Add a status update"
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 rounded bg-red-50 px-3 py-2">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
