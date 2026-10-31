import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'

export default function Layout() {
  const [open, setOpen] = useState(false)
  return (
    <div className="min-h-screen flex canvas-light">
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <main className="flex-1 flex flex-col min-w-0">
        <Header onMenu={() => setOpen(true)} />
        <div className="px-4 md:px-6 pb-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}