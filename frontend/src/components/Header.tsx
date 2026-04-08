import { Link, useNavigate } from 'react-router-dom'
import { Bell, User, LogOut, Search, ChevronDown } from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { useState, useEffect } from 'react'
import { notificationsApi } from '../services/api'

const Header = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [unreadCount, setUnreadCount] = useState(0)
  const [showUserMenu, setShowUserMenu] = useState(false)

  useEffect(() => {
    fetchUnreadCount()
    const interval = setInterval(fetchUnreadCount, 30000)
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

  const initials = user?.name
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || 'U'

  return (
    <header className="bg-white border-b border-gray-200 px-6 h-16 flex items-center justify-between sticky top-0 z-40 flex-shrink-0">
      {/* Search */}
      <div className="relative hidden md:flex items-center">
        <Search className="absolute left-3 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search containers, shipments..."
          className="pl-9 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white w-72 transition-all"
        />
      </div>

      {/* Right Side */}
      <div className="flex items-center space-x-2 ml-auto">
        {/* Notifications */}
        <Link
          to="/notifications"
          className="relative p-2.5 hover:bg-gray-100 rounded-lg transition text-gray-500 hover:text-gray-700"
        >
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 bg-accent-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-semibold leading-none">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 mx-1" />

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center space-x-2.5 px-2 py-1.5 hover:bg-gray-100 rounded-lg transition"
          >
            <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-semibold text-gray-900 leading-none">{user?.name}</p>
              <p className="text-xs text-gray-400 mt-0.5 capitalize">{user?.role}</p>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 hidden sm:block" />
          </button>

          {showUserMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{user?.company}</p>
                </div>
                <Link
                  to="/profile"
                  className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="w-4 h-4 mr-3 text-gray-400" />
                  My Profile
                </Link>
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition"
                  >
                    <LogOut className="w-4 h-4 mr-3" />
                    Sign Out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
