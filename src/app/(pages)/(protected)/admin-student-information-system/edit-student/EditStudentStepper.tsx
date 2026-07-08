'use client'

import { cn } from '@/lib/utils'
import { EDIT_STEPS, type EditStepId } from './edit-student-utils'

export interface EditStudentStepperProps {
  activeStep: EditStepId
  progress: number
  onStepClick?: (step: EditStepId) => void
}

export function EditStudentStepper({ activeStep, progress, onStepClick }: EditStudentStepperProps) {
  const activeIndex = EDIT_STEPS.findIndex((s) => s.id === activeStep)

  return (
    <div className="overflow-hidden rounded-md border border-[#dbe8f6] bg-[#f6fbff]">
      <div className="h-[3px] w-full bg-[#d7e6f5]">
        <div
          className="h-full bg-[#2f8fd4] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="grid grid-cols-2 gap-y-2 px-3 py-2 sm:grid-cols-5 sm:gap-y-0 sm:px-4">
        {EDIT_STEPS.map((step, index) => {
          const isActive = step.id === activeStep
          const isDone = index < activeIndex
          return (
            <button
              key={step.id}
              type="button"
              disabled={!onStepClick}
              onClick={() => onStepClick?.(step.id)}
              className={cn(
                'group inline-flex items-center gap-1.5 rounded-md px-1 py-1 text-[12px] font-medium transition-colors',
                isActive && 'text-[#1f3f66]',
                !isActive && isDone && 'text-[#2f8fd4]',
                !isActive && !isDone && 'text-[#6b7c93]',
                onStepClick && 'hover:bg-[#eaf3fb]',
              )}
            >
              <span
                className={cn(
                  'inline-flex h-4.5 w-4.5 items-center justify-center rounded-full text-[10px] font-semibold',
                  isActive && 'bg-[#2f8fd4] text-white shadow-sm',
                  !isActive && isDone && 'bg-[#8fc9f0] text-[#0f4d7d]',
                  !isActive && !isDone && 'bg-[#d6e7f5] text-[#6b7c93]',
                )}
              >
                {index + 1}
              </span>
              <span className={cn(isActive && 'font-semibold')}>{step.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
