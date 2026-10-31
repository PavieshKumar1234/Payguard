import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export default function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy/80 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="glass-card p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="text-on-dark-subtle hover:text-cyanx transition-colors"><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
