import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  Ship,
  Anchor,
  CheckCircle,
  Bell,
  ChevronRight,
  Upload,
  MessageSquare,
  ArrowRight,
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { shipmentsApi } from '../services/api'
import { formatDistanceToNow } from 'date-fns'

interface ShipmentStats {
  total: number
  onSea: number
  atMombasa: number
  completed: number
}

interface Shipment {
  _id: string
  containerNumber: string
  status: string
  origin: string
  destination: string
  eta: string
  clients: Array<{ _id: string; name: string; company: string }>
}

// All status styles use only primary (blue) and accent (orange) shades
const statusConfig: Record<string, { label: string; dot: string; badge: string }> = {
  on_sea:           { label: 'On Sea',      dot: 'bg-primary-500',  badge: 'bg-primary-100 text-primary-700' },
  arrived_mombasa:  { label: 'Arrived',     dot: 'bg-accent-500',   badge: 'bg-accent-100 text-accent-700' },
  discharged:       { label: 'Discharged',  dot: 'bg-primary-300',  badge: 'bg-primary-50 text-primary-600' },
  in_transit:       { label: 'In Transit',  dot: 'bg-primary-400',  badge: 'bg-primary-100 text-primary-600' },
  delivered:        { label: 'Delivered',   dot: 'bg-primary-700',  badge: 'bg-primary-100 text-primary-800' },
  completed:        { label: 'Completed',   dot: 'bg-primary-700',  badge: 'bg-primary-100 text-primary-800' },
}

const getStatus = (s: string) =>
  statusConfig[s] || { label: s, dot: 'bg-primary-300', badge: 'bg-primary-50 text-primary-600' }

const Dashboard = () => {
  const { user } = useAuthStore()
  const [stats, setStats] = useState<ShipmentStats>({ total: 0, onSea: 0, atMombasa: 0, completed: 0 })
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const statsRes = await shipmentsApi.getStats()
      setStats(statsRes.data.data)
      const shipmentsRes = await shipmentsApi.getAll({ limit: 5 })
      setShipments(shipmentsRes.data.data.shipments)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })

  const statCards = [
    { label: 'Total Shipments', value: stats.total,     icon: Package,      muted: false },
    { label: 'On Sea',          value: stats.onSea,     icon: Ship,         muted: false },
    { label: 'At Mombasa',      value: stats.atMombasa, icon: Anchor,       muted: true  },
    { label: 'Completed',       value: stats.completed, icon: CheckCircle,  muted: true  },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-primary-600 rounded-2xl px-6 py-5 text-white">
        <p className="text-primary-200 text-xs font-medium">{today}</p>
        <h1 className="text-xl font-bold mt-1">
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-primary-300 text-sm mt-0.5">{user?.company}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                card.muted ? 'bg-accent-50' : 'bg-primary-50'
              }`}>
                <card.icon className={`w-5 h-5 ${card.muted ? 'text-accent-500' : 'text-primary-500'}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shipments */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Active Shipments</h2>
            <Link
              to="/shipments"
              className="text-xs text-primary-500 hover:text-primary-700 font-medium flex items-center"
            >
              View All <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </Link>
          </div>
          <div className="p-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-14 bg-gray-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : shipments.length === 0 ? (
              <div className="text-center py-12">
                <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No active shipments</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {shipments.map((shipment) => {
                  const status = getStatus(shipment.status)
                  return (
                    <Link
                      key={shipment._id}
                      to={`/shipments/${shipment._id}`}
                      className="flex items-center justify-between py-3.5 px-2 hover:bg-gray-50 rounded-xl transition group"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status.dot}`} />
                        <div className="min-w-0">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm text-gray-900">
                              {shipment.containerNumber}
                            </span>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${status.badge}`}>
                              {status.label}
                            </span>
                          </div>
                          <div className="flex items-center space-x-1 mt-0.5">
                            <span className="text-xs text-gray-400">{shipment.origin}</span>
                            <ArrowRight className="w-3 h-3 text-gray-300" />
                            <span className="text-xs text-gray-500">{shipment.destination}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 flex-shrink-0">
                        <div className="text-right hidden sm:block">
                          <p className="text-xs text-gray-400">ETA</p>
                          <p className="text-xs font-semibold text-gray-700">
                            {formatDistanceToNow(new Date(shipment.eta), { addSuffix: true })}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-gray-400 transition" />
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Quick Actions</h2>
            <div className="space-y-2">
              <Link
                to="/documents"
                className="flex items-center space-x-3 p-3 rounded-xl bg-primary-50 hover:bg-primary-100 transition"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Upload className="w-4 h-4 text-primary-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-primary-700">Upload Document</p>
                  <p className="text-xs text-primary-400">Add shipping files</p>
                </div>
              </Link>
              <button className="w-full flex items-center space-x-3 p-3 rounded-xl bg-accent-50 hover:bg-accent-100 transition">
                <div className="w-8 h-8 bg-accent-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="w-4 h-4 text-accent-600" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-accent-700">Send Message</p>
                  <p className="text-xs text-accent-400">Contact your agent</p>
                </div>
              </button>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Notifications</h2>
              <Link to="/notifications" className="text-xs text-primary-500 hover:text-primary-700 font-medium">
                View All
              </Link>
            </div>
            {notifications.length === 0 ? (
              <div className="text-center py-8">
                <Bell className="w-7 h-7 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-xs">No new notifications</p>
              </div>
            ) : (
              <div className="space-y-2">
                {notifications.slice(0, 3).map((n: any) => (
                  <div key={n._id} className="flex items-start space-x-2.5 p-3 bg-gray-50 rounded-xl">
                    <div className="w-1.5 h-1.5 bg-primary-500 rounded-full mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{n.title}</p>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
