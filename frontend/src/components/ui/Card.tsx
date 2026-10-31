import type { ReactNode } from 'react'

export default function Card({ children, className = '', hover = false }: { children: ReactNode; className?: string; hover?: boolean }) {
  return <div className={`glass-card p-5 ${hover ? 'glass-card-hover' : ''} ${className}`}>{children}</div>
}
