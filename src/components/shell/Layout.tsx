import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { NeedsMe } from '../kit/NeedsMe'
import { DrawerHost } from './DrawerHost'
import { Toasts } from '../Toasts'
import { CommandSearch } from '../CommandSearch'
import { CopilotPanel } from '../copilot/CopilotPanel'

export function Layout() {
  return (
    <div className="flex h-screen min-w-[1024px] overflow-hidden bg-canvas">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <NeedsMe />
        <main className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[1480px] px-6 py-5">
            <Outlet />
          </div>
        </main>
      </div>
      <Toasts />
      <CommandSearch />
      <CopilotPanel />
      <DrawerHost />
    </div>
  )
}
