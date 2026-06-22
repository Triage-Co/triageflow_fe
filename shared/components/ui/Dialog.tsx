"use client"

import * as React from "react"
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

/* ─── Root / Trigger / Portal / Close ────────────────────────────────────── */
const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogPortal = DialogPrimitive.Portal
const DialogClose = DialogPrimitive.Close

/* ─── Overlay (Backdrop) ─────────────────────────────────────────────────── */
const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Backdrop>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Backdrop
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/45 backdrop-blur-[6px]",
      /* Base UI uses data-open when open, data-ending-style when closing */
      "transition-opacity duration-300",
      "data-[open]:opacity-100 data-[open]:animate-in data-[open]:fade-in-0",
      "data-[ending-style]:opacity-0 data-[ending-style]:animate-out data-[ending-style]:fade-out-0",
      "opacity-0",
      className
    )}
    {...props}
  />
))
DialogOverlay.displayName = "DialogOverlay"

/* ─── Content (Popup) ────────────────────────────────────────────────────── */
interface DialogContentProps extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Popup> {
  position?: 'center' | 'left' | 'right' | 'bottom';
  showCloseButton?: boolean;
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, position = "center", showCloseButton = true, ...props }, ref) => (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Popup
        ref={ref}
        className={cn(
          "fixed z-50 gap-4 bg-white p-6 shadow-2xl outline-none",
          "transition-all duration-300",

          position === "center" && [
            "left-1/2 top-1/2 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[32px] border border-neutral-100",
            "data-[open]:animate-in data-[open]:fade-in-0 data-[open]:zoom-in-95 data-[open]:slide-in-from-left-1/2 data-[open]:slide-in-from-top-1/2",
            "data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:zoom-out-95 data-[ending-style]:slide-out-to-left-1/2 data-[ending-style]:slide-out-to-top-1/2"
          ],

          position === "right" && [
            "right-0 top-0 h-full w-full max-w-md rounded-l-[32px] border-l border-neutral-100",
            "data-[open]:animate-in data-[open]:fade-in-0 data-[open]:slide-in-from-right",
            "data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:slide-out-to-right"
          ],

          position === "left" && [
            "left-0 top-0 h-full w-full max-w-md rounded-r-[32px] border-r border-neutral-100",
            "data-[open]:animate-in data-[open]:fade-in-0 data-[open]:slide-in-from-left",
            "data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:slide-out-to-left"
          ],

          position === "bottom" && [
            "bottom-0 left-1/2 w-full max-w-lg -translate-x-1/2 rounded-t-[32px] border-t border-neutral-100",
            "data-[open]:animate-in data-[open]:fade-in-0 data-[open]:slide-in-from-bottom",
            "data-[ending-style]:animate-out data-[ending-style]:fade-out-0 data-[ending-style]:slide-out-to-bottom"
          ],

          className
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close className="absolute right-5 top-5 rounded-[24px] p-1.5 text-neutral-400 opacity-70 transition-all hover:bg-neutral-100 hover:text-neutral-900 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-brand-500/20 active:scale-95">
            <X className="h-4.5 w-4.5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Popup>
    </DialogPortal>
  )
)
DialogContent.displayName = "DialogContent"

/* ─── Header ─────────────────────────────────────────────────────────────── */
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col gap-1.5 text-left",
      className
    )}
    {...props}
  />
)
DialogHeader.displayName = "DialogHeader"

/* ─── Footer ─────────────────────────────────────────────────────────────── */
const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:gap-2",
      className
    )}
    {...props}
  />
)
DialogFooter.displayName = "DialogFooter"

/* ─── Title ──────────────────────────────────────────────────────────────── */
const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      "text-lg font-bold leading-none tracking-tight text-neutral-900",
      className
    )}
    {...props}
  />
))
DialogTitle.displayName = "DialogTitle"

/* ─── Description ────────────────────────────────────────────────────────── */
const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-neutral-500 font-medium", className)}
    {...props}
  />
))
DialogDescription.displayName = "DialogDescription"

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
  DialogClose,
}
