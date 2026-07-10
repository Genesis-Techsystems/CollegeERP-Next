"use client"

import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName

type DialogContentProps = React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & {
  hideClose?: boolean
  /** When false, clicking the backdrop does not close the dialog. Default false. */
  closeOnOutsideClick?: boolean
  /** When false, pressing Escape does not close the dialog. Default false. */
  closeOnEscape?: boolean
  /**
   * Accessible description for screen readers. When provided it is rendered as a
   * visually-hidden DialogDescription (linked automatically by Radix).
   */
  description?: React.ReactNode
  /**
   * Set by callers that render their own <DialogDescription> child (e.g.
   * ConfirmDialog / FormModal) so this component does NOT clear aria-describedby.
   * When neither `description`, `hasDescription`, nor an explicit
   * `aria-describedby` is supplied, aria-describedby is cleared so Radix does not
   * emit the "Missing Description or aria-describedby" warning for description-less
   * dialogs.
   */
  hasDescription?: boolean
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  DialogContentProps
>(({ className, children, hideClose = false, closeOnOutsideClick = false, closeOnEscape = false, onInteractOutside, onEscapeKeyDown, description, hasDescription = false, "aria-describedby": ariaDescribedBy, ...props }, ref) => {
  const padded = !/\bp-0\b/.test(className ?? "")

  // Silence Radix's "Missing Description or aria-describedby" warning:
  // - explicit aria-describedby → pass it through
  // - a `description` prop (rendered as a hidden DialogDescription below) or a
  //   caller-rendered <DialogDescription> child (hasDescription) → leave the
  //   default so Radix links its own id
  // - none of the above (description-less dialog) → clear aria-describedby (the
  //   valid Radix opt-out) so no dangling reference / warning
  const ariaDescribedByProps =
    ariaDescribedBy !== undefined
      ? { "aria-describedby": ariaDescribedBy }
      : description !== undefined || hasDescription
        ? {}
        : { "aria-describedby": undefined }

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        {...ariaDescribedByProps}
        data-dialog-padded={padded ? "" : undefined}
        onInteractOutside={(e) => {
          if (!closeOnOutsideClick) e.preventDefault()
          onInteractOutside?.(e)
        }}
        onEscapeKeyDown={(e) => {
          if (!closeOnEscape) e.preventDefault()
          onEscapeKeyDown?.(e)
        }}
        className={cn(
          "group/dialog fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg",
          padded ? "px-6 pb-6 pt-0" : "p-0",
          className
        )}
        {...props}
      >
        {description !== undefined ? (
          <DialogDescription className="sr-only">{description}</DialogDescription>
        ) : null}
        {children}
        {!hideClose && (
          <DialogPrimitive.Close className="absolute right-4 top-0 z-10 flex h-14 w-9 items-center justify-center rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
})
DialogContent.displayName = DialogPrimitive.Content.displayName

function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex min-h-14 items-center border-b border-border bg-muted/40 pr-12 text-center sm:text-left",
        "group-data-[dialog-padded]/dialog:-mx-6 group-data-[dialog-padded]/dialog:px-6",
        "px-6",
        className
      )}
      {...props}
    />
  )
}
DialogHeader.displayName = "DialogHeader"

function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)}
      {...props}
    />
  )
}
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight m-0", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
