"use client"

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { X } from "lucide-react"

interface DialogContextValue {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const DialogContext = React.createContext<DialogContextValue | undefined>(undefined)

interface DialogProps {
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: React.ReactNode
}

const Dialog = ({ open = false, onOpenChange, children }: DialogProps) => {
  const value = React.useMemo(
    () => ({ open, onOpenChange: onOpenChange || (() => {}) }),
    [open, onOpenChange]
  )

  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  )
}

interface DialogContentProps extends React.HTMLAttributes<HTMLDivElement> {
  onClose?: () => void
}

const DialogContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  ({ className, children, onClose, ...props }, ref) => {
    const context = React.useContext(DialogContext)
    const [isClient, setIsClient] = React.useState(false)

    React.useEffect(() => {
      setIsClient(true)
      // Ensure modal root exists
      if (typeof document !== 'undefined' && !document.getElementById('modal-root')) {
        const modalRoot = document.createElement('div')
        modalRoot.id = 'modal-root'
        document.body.appendChild(modalRoot)
      }
    }, [])

    React.useEffect(() => {
      if (context?.open) {
        document.body.style.overflow = 'hidden'
        return () => {
          document.body.style.overflow = 'unset'
        }
      }
    }, [context?.open])

    if (!isClient) return null

    const handleClose = () => {
      if (onClose) {
        onClose()
      } else if (context?.onOpenChange) {
        context.onOpenChange(false)
      }
    }

    const content = (
      <AnimatePresence>
        {context?.open && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={handleClose}
            />
            
            {/* Dialog */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 500 }}
              className="fixed inset-0 flex items-center justify-center p-4 sm:p-6 md:p-8 z-50 pointer-events-none"
            >
              <div
                ref={ref}
                className={cn(
                  "bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full",
                  "flex flex-col max-h-[90vh] relative pointer-events-auto",
                  "overflow-hidden",
                  className
                )}
                onClick={(e) => e.stopPropagation()}
                {...props}
              >
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    )

    const modalRoot = document.getElementById('modal-root') || document.body
    return createPortal(content, modalRoot)
  }
)
DialogContent.displayName = "DialogContent"

interface DialogHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

const DialogHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        "flex flex-col space-y-1.5 text-center sm:text-left p-6 pb-4",
        className
      )}
      {...props}
    />
  )
)
DialogHeader.displayName = "DialogHeader"

interface DialogTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {}

const DialogTitle = React.forwardRef<HTMLHeadingElement, DialogTitleProps>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn(
        "text-lg font-semibold leading-none tracking-tight",
        className
      )}
      {...props}
    />
  )
)
DialogTitle.displayName = "DialogTitle"

interface DialogDescriptionProps extends React.HTMLAttributes<HTMLParagraphElement> {}

const DialogDescription = React.forwardRef<HTMLParagraphElement, DialogDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  )
)
DialogDescription.displayName = "DialogDescription"

export {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
}