'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { UserRole } from '@avimus/types'

interface SidebarProps {
  tenantName: string
  userName: string
  role: UserRole
}

const navItems = [
  { href: '/dashboard', label: 'Dashboard', roles: ['admin', 'medico', 'recepcionista', 'enfermeiro'] as UserRole[] },
  { href: '/patients', label: 'Pacientes', roles: ['admin', 'medico', 'recepcionista', 'enfermeiro'] as UserRole[] },
  { href: '/protocols', label: 'Protocolos', roles: ['admin'] as UserRole[] },
]

export function Sidebar({ tenantName, userName, role }: SidebarProps) {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-card">
      <div className="border-b px-4 py-4">
        <h2 className="text-sm font-bold truncate">{tenantName}</h2>
        <p className="text-xs text-muted-foreground">Avimus</p>
      </div>

      <nav className="flex-1 px-2 py-4 space-y-1">
        {navItems
          .filter(item => item.roles.includes(role))
          .map(item => {
            const isActive = pathname.startsWith(item.href)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-muted'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
      </nav>

      <div className="border-t px-4 py-3">
        <p className="text-sm font-medium truncate">{userName}</p>
        <p className="text-xs text-muted-foreground capitalize">{role}</p>
      </div>
    </aside>
  )
}
