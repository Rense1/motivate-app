'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  if (!isOpen) return null

  return (
    /*
     * Use 100dvh (dynamic viewport height) so the overlay always matches the
     * *visible* viewport — i.e. it shrinks when the software keyboard appears.
     * This keeps the modal panel above the keyboard on iOS / Android.
     */
    <div
      className="fixed inset-x-0 top-0 z-50 flex flex-col justify-end sm:justify-center sm:items-center"
      style={{ height: '100dvh' }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Panel — max-height in dvh so it never overflows into the keyboard area */}
      <div
        className="relative bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-md z-10 flex flex-col"
        style={{ maxHeight: '78dvh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          {title && <h2 className="text-lg font-bold text-gray-800">{title}</h2>}
          <button onClick={onClose} className="ml-auto p-1 rounded-full hover:bg-gray-100">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="p-5 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
