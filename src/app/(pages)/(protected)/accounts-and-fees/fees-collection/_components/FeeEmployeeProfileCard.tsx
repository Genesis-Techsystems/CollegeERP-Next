'use client'

import { useEffect, useState } from 'react'
import { UserRound } from 'lucide-react'
import type { EmployeeProfileRow } from '@/types/fees-collection'

export function FeeEmployeeProfileCard({ employee }: { readonly employee: EmployeeProfileRow }) {
  const photoPath = employee.photoPath?.trim()
  const [photoFailed, setPhotoFailed] = useState(false)
  const showPhoto = Boolean(photoPath) && !photoFailed

  useEffect(() => {
    setPhotoFailed(false)
  }, [employee.employeeId, photoPath])

  return (
    <div className="rounded-lg border border-sky-200 bg-sky-50/30 p-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-white">
          {showPhoto ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={photoPath}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setPhotoFailed(true)}
            />
          ) : (
            <UserRound className="h-10 w-10 text-slate-400" aria-hidden />
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-0.5 text-xs text-slate-500">
          <p className="text-sm font-medium text-amber-700">{employee.firstName}</p>
          <p>
            <span className="font-medium text-blue-600">{employee.empNumber}</span>
          </p>
          {employee.collegeCode || employee.deptName ? (
            <p>
              {[employee.collegeCode, employee.deptName].filter(Boolean).join(' / ')}
            </p>
          ) : null}
          {employee.mobile ? <p>{employee.mobile}</p> : null}
        </div>
      </div>
    </div>
  )
}
