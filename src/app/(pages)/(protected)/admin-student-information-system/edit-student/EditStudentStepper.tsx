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
    <div className="space-y-3">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex flex-wrap gap-1 border-b border-border pb-2">
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
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                isActive && 'bg-primary text-primary-foreground',
                !isActive && isDone && 'text-primary',
                !isActive && !isDone && 'text-muted-foreground',
                onStepClick && 'hover:bg-muted',
              )}
            >
              {step.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
