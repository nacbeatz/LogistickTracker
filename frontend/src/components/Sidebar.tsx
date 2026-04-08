import { useEffect, useState } from 'react'
import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  FileText,
  Bell,
  User,
  Users,
  BarChart3,
  PlusCircle,
  DollarSign,
  Ship,
  Activity
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { dashboardApi, documentsApi } from '../services/api'

const Sidebar = () => {
  const { user } = useAuthStore()
  const [liveStats, setLiveStats] = useState<{ active: number | string; onSea: number | string; pendingDocs: number | string }>({
    active: '—', onSea: '—', pendingDocs: '—'
  })

  useEffect(() => {
    if (!user) return
    const fetchLiveStats = async () => {
      try {
        if (user.role === 'client') {
          const [dashRes, docsRes] = await Promise.all([
            dashboardApi.getClientDashboard(),
            documentsApi.getAll({ status: 'pending' })
          ])
          const d = dashRes.data.data
          setLiveStats({
            active: d.shipments.active.length,
            onSea: d.shipments.byStatus?.on_sea || 0,
            pendingDocs: docsRes.data.data.documents.length
          })
        } else {
          const res = await dashboardApi.getOverview()
          const d = res.data.data
          setLiveStats({
            active: d.shipments.total,
            onSea: d.shipments.onSea,
            pendingDocs: d.documents.pending
          })
        }
      } catch {
        // silently fail — sidebar stats are non-critical
      }
    }
    fetchLiveStats()
  }, [user])

  const clientLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/shipments', icon: Package, label: 'My Shipments' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/invoices', icon: DollarSign, label: 'Invoices' },
    { to: '/notifications', icon: Bell, label: 'Notifications' },
    { to: '/profile', icon: User, label: 'Profile' },
  ]

  const staffLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/shipments', icon: Package, label: 'Shipments' },
    { to: '/shipments/new', icon: PlusCircle, label: 'New Shipment' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/invoices', icon: DollarSign, label: 'Invoices' },
    { to: '/staff', icon: Users, label: 'Staff Portal' },
  ]

  const managerLinks = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/shipments', icon: Package, label: 'Shipments' },
    { to: '/shipments/new', icon: PlusCircle, label: 'New Shipment' },
    { to: '/documents', icon: FileText, label: 'Documents' },
    { to: '/invoices', icon: DollarSign, label: 'Invoices' },
    { to: '/staff', icon: Users, label: 'Staff Portal' },
    { to: '/manager', icon: BarChart3, label: 'Analytics' },
  ]

  const getLinks = () => {
    if (user?.role === 'manager' || user?.role === 'admin') return managerLinks
    if (user?.role === 'staff') return staffLinks
    return clientLinks
  }

  const links = getLinks()

  return (
    <aside className="hidden lg:flex flex-col w-64 bg-primary-900 h-screen sticky top-0 flex-shrink-0 overflow-y-auto">
      {/* Logo */}
      <Link
        to="/dashboard"
        className="flex items-center space-x-3 px-5 h-16 border-b border-primary-800 flex-shrink-0"
      >
        <div className="w-9 h-9 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0">
          <Ship className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-white text-sm leading-tight truncate">
            Messenger Logistics
          </h1>
          <p className="text-primary-300 text-xs mt-0.5">Shipment Tracker</p>
        </div>
      </Link>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-5 space-y-0.5 overflow-y-auto">
        <p className="text-primary-400 text-xs font-semibold uppercase tracking-wider px-3 mb-3">
          Navigation
        </p>
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/dashboard'}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all text-sm font-medium ${
                isActive
                  ? 'bg-primary-500 text-white'
                  : 'text-primary-300 hover:bg-primary-800 hover:text-white'
              }`
            }
          >
            <link.icon className="w-4 h-4 flex-shrink-0" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Live Status */}
      <div className="px-3 pb-5 border-t border-primary-800 pt-4 flex-shrink-0">
        <div className="flex items-center space-x-2 px-3 mb-3">
          <Activity className="w-3.5 h-3.5 text-primary-400" />
          <p className="text-primary-400 text-xs font-semibold uppercase tracking-wider">
            Live Status
          </p>
        </div>
        <div className="bg-primary-800 rounded-lg px-3 py-3 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-primary-300 text-xs">Active Shipments</span>
            <span className="text-white text-xs font-bold bg-primary-700 px-2 py-0.5 rounded-full">
              {liveStats.active}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-primary-300 text-xs">On Sea</span>
            <span className="text-primary-200 text-xs font-bold bg-primary-700 px-2 py-0.5 rounded-full">
              {liveStats.onSea}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-primary-300 text-xs">Pending Docs</span>
            <span className="text-accent-300 text-xs font-bold bg-primary-700 px-2 py-0.5 rounded-full">
              {liveStats.pendingDocs}
            </span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
