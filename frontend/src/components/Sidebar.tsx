import { NavLink } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Package, 
  FileText, 
  Bell, 
  User,
  Users,
  BarChart3,
  PlusCircle,
  DollarSign
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'

const Sidebar = () => {
  const { user } = useAuthStore()

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
    <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 min-h-[calc(100vh-120px)]">
      <nav className="p-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
                isActive
                  ? 'bg-primary-50 text-primary-600 font-medium'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Quick Stats */}
      <div className="p-4 border-t border-gray-200">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
          Quick Stats
        </h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Active Shipments</span>
            <span className="font-medium">12</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">On Sea</span>
            <span className="font-medium text-primary-600">3</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Pending Docs</span>
            <span className="font-medium text-accent-500">2</span>
          </div>
        </div>
      </div>
    </aside>
  )
}

export default Sidebar
