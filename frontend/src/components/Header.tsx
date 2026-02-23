import { Link, useNavigate } from 'react-router-dom'
import { Bell, User, LogOut, Menu } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useState, useEffect } from 'react'
import { notificationsApi } from '../services/api'

const Header = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000) // Poll every 30s
    return () => clearInterval(interval)
  }, [])

  const fetchUnreadCount = async () => {
    try {
      const response = await notificationsApi.getAll({ unreadOnly: true })
      setUnreadCount(response.data.data.unreadCount)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-primary-500 text-white sticky top-0 z-50">
      {/* Top Bar */}
      <div className="bg-primary-600 py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
          <div className="flex items-center space-x-4">
            <span>📧 messengerltd2021@gmail.com</span>
            <span>📞 +250788310510</span>
          </div>
          <div className="hidden md:flex items-center space-x-4">
            <span>Follow Us:</span>
            <span>📷 🐦 👥 ▶️</span>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="px-4 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Logo */}
          <Link to="/dashboard" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-primary-500 font-bold text-lg">MLT</span>
            </div>
            <div className="hidden sm:block">
              <h1 className="font-bold text-lg">Messenger Logistics</h1>
              <p className="text-xs text-primary-100">Shipment Tracking System</p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/dashboard" className="hover:text-primary-100 transition">Dashboard</Link>
            <Link to="/shipments" className="hover:text-primary-100 transition">Shipments</Link>
            <Link to="/documents" className="hover:text-primary-100 transition">Documents</Link>
            <Link to="/invoices" className="hover:text-primary-100 transition">Invoices</Link>
            {user?.role !== 'client' && (
              <Link to="/staff" className="hover:text-primary-100 transition">Staff</Link>
            )}
            {(user?.role === 'manager' || user?.role === 'admin') && (
              <Link to="/manager" className="hover:text-primary-100 transition">Manager</Link>
            )}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <Link to="/notifications" className="relative p-2 hover:bg-primary-600 rounded-lg transition">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-accent-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 p-2 hover:bg-primary-600 rounded-lg transition"
              >
                <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-primary-500" />
                </div>
                <span className="hidden sm:block">{user?.name}</span>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 text-gray-800">
                  <Link
                    to="/profile"
                    className="block px-4 py-2 hover:bg-gray-100"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 hover:bg-gray-100 text-red-600 flex items-center"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden p-2 hover:bg-primary-600 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {showMobileMenu && (
        <div className="md:hidden bg-primary-600 px-4 py-2">
          <nav className="flex flex-col space-y-2">
            <Link to="/dashboard" className="py-2 hover:text-primary-100">Dashboard</Link>
            <Link to="/shipments" className="py-2 hover:text-primary-100">Shipments</Link>
            <Link to="/documents" className="py-2 hover:text-primary-100">Documents</Link>
            {user?.role !== 'client' && (
              <Link to="/staff" className="py-2 hover:text-primary-100">Staff</Link>
            )}
            {(user?.role === 'manager' || user?.role === 'admin') && (
              <Link to="/manager" className="py-2 hover:text-primary-100">Manager</Link>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}

export default Header
