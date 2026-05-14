'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { signOut } from '@/app/actions/auth'
import {
  Home, Users, Briefcase, TrendingUp, FileText,
  DollarSign, Clock, Sparkles, BarChart3, Zap,
  UsersRound, Settings, ChevronDown, Bell, LogOut, Zap as Upgrade,
} from 'lucide-react'

interface NavItem {
  href: string
  label: string
  icon: React.ElementType
}

interface NavSection {
  title: string
  items: NavItem[]
}

const navSections: NavSection[] = [
  {
    title: 'Zona de Lucru',
    items: [
      { icon: Home,      label: 'Dashboard',    href: '/dashboard' },
      { icon: Users,     label: 'Clienți',       href: '/clients'   },
      { icon: Briefcase, label: 'Proiecte',      href: '/projects'  },
    ],
  },
  {
    title: 'Vânzări & Financiar',
    items: [
      { icon: TrendingUp,  label: 'Pipeline',  href: '/pipeline'    },
      { icon: FileText,    label: 'Oferte',    href: '/offers'      },
      { icon: DollarSign,  label: 'Facturi',   href: '/financials'  },
      { icon: Clock,       label: 'Pontaj',    href: '/time'        },
    ],
  },
  {
    title: 'Performanță și AI',
    items: [
      { icon: Sparkles, label: 'AI Assistant',  href: '/ai'          },
      { icon: BarChart3, label: 'Analytics',    href: '/analytics'   },
      { icon: Zap,       label: 'Automatizări', href: '/automations' },
    ],
  },
  {
    title: 'Sistem & Administrare',
    items: [
      { icon: Bell,      label: 'Notificări', href: '/notifications' },
      { icon: UsersRound, label: 'Echipă',    href: '/team'         },
      { icon: Settings,  label: 'Setări',     href: '/settings'     },
    ],
  },
]

interface SidebarProps {
  userEmail?: string
  userName?: string
  unreadCount?: number
}

export default function Sidebar({ userEmail, userName, unreadCount = 0 }: SidebarProps) {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState<string[]>([
    'Zona de Lucru', 'Vânzări & Financiar', 'Performanță și AI', 'Sistem & Administrare',
  ])

  const toggle = (title: string) =>
    setExpanded(prev =>
      prev.includes(title) ? prev.filter(t => t !== title) : [...prev, title]
    )

  const isActive = (href: string) =>
    href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(href)

  return (
    <aside className="flex flex-col w-64 h-screen bg-[#1a1a1a] shrink-0 overflow-y-auto">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center px-6 py-6 mb-2 shrink-0">
        <Image src="/logo-white.svg" alt="Limeeo" width={110} height={22} priority />
      </Link>

      {/* Nav sections */}
      <nav className="flex-1 px-4 space-y-5">
        {navSections.map((section) => {
          const isExpanded = expanded.includes(section.title)
          return (
            <div key={section.title}>
              <button
                onClick={() => toggle(section.title)}
                className="w-full flex items-center justify-between px-3 py-1.5 mb-1 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  {section.title}
                </span>
                <ChevronDown
                  size={13}
                  className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </button>

              {isExpanded && (
                <div className="space-y-0.5">
                  {section.items.map((item) => {
                    const active = isActive(item.href)
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl transition-all text-sm font-semibold ${
                          active
                            ? 'bg-[#acff55] text-black'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <item.icon size={17} strokeWidth={active ? 2.2 : 1.8} />
                        <span>{item.label}</span>
                        {item.href === '/notifications' && unreadCount > 0 && (
                          <span className="ml-auto text-[10px] font-bold bg-[#acff55] text-black rounded-full px-1.5 py-0.5 leading-none">
                            {unreadCount}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 mt-auto border-t border-white/10 space-y-1 shrink-0">
        {/* Upgrade */}
        <Link
          href="/upgrade"
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold text-amber-400 hover:bg-white/5 hover:text-amber-300 transition-all"
        >
          <Upgrade size={17} strokeWidth={1.8} />
          <span>Upgrade plan</span>
        </Link>

        {/* User */}
        <div className="flex items-center gap-3 px-4 py-2.5 rounded-2xl">
          <div className="w-8 h-8 rounded-full bg-[#acff55] flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-black uppercase">
              {userName ? userName[0] : userEmail?.[0] ?? 'U'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            {userName && (
              <p className="text-xs font-semibold text-white truncate">{userName}</p>
            )}
            <p className="text-[11px] text-gray-500 truncate">{userEmail}</p>
          </div>
        </div>

        {/* Logout */}
        <form action={signOut}>
          <button
            type="submit"
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-semibold text-gray-500 hover:text-white hover:bg-white/5 transition-all"
          >
            <LogOut size={17} strokeWidth={1.8} />
            <span>Deconectare</span>
          </button>
        </form>
      </div>
    </aside>
  )
}
