import Logo from '@/components/ui/Logo'
import { NotificationBell } from '@/components/notifications/NotificationBell'

/**
 * Global top navigation bar — shown on every app screen.
 * Height: 56px (h-14). All page sub-headers use sticky top-14 to sit below this.
 */
export function TopNavBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4">
      <Logo width={130} />
      <NotificationBell />
    </header>
  )
}
