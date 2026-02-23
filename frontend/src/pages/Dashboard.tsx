import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Package, 
  Ship, 
  Anchor, 
  CheckCircle, 
  AlertCircle,
  ChevronRight,
  Upload,
  MessageSquare
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { dashboardApi, shipmentsApi } from '../services/api'
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
      
      // Fetch stats
      const statsResponse = await shipmentsApi.getStats()
      setStats(statsResponse.data.data)
      
      // Fetch recent shipments
      const shipmentsResponse = await shipmentsApi.getAll({ limit: 5 })
      setShipments(shipmentsResponse.data.data.shipments)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      on_sea: { label: '🚢 On Sea', className: 'badge-blue' },
      arrived_mombasa: { label: '⚓ Arrived', className: 'badge-orange' },
      discharged: { label: '📦 Discharged', className: 'badge-yellow' },
      in_transit: { label: '🚛 In Transit', className: 'badge-yellow' },
      delivered: { label: '✅ Delivered', className: 'badge-green' },
      completed: { label: '✅ Completed', className: 'badge-green' },
    }
    return statusMap[status] || { label: status, className: 'badge-blue' }
  }

  const statCards = [
    { label: 'Total Shipments', value: stats.total, icon: Package, color: 'bg-primary-500' },
    { label: 'On Sea', value: stats.onSea, icon: Ship, color: 'bg-primary-500' },
    { label: 'At Mombasa', value: stats.atMombasa, icon: Anchor, color: 'bg-accent-500' },
    { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'bg-green-500' },
  ]

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {user?.name}
          </h1>
          <p className="text-gray-500">{user?.company}</p>
        </div>
        <p className="text-gray-500">
          {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, index) => (
          <div key={index} className="card">
            <div className={`h-1 ${card.color} rounded-t-xl`} />
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                </div>
                <div className={`w-12 h-12 ${card.color} bg-opacity-10 rounded-lg flex items-center justify-center`}>
                  <card.icon className={`w-6 h-6 ${card.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Shipments */}
        <div className="lg:col-span-2 card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Active Shipments</h2>
            <Link to="/shipments" className="text-primary-600 hover:text-primary-700 text-sm flex items-center">
              View All <ChevronRight className="w-4 h-4 ml-1" />
            </Link>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="text-center py-8 text-gray-500">Loading...</div>
            ) : shipments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No active shipments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {shipments.map((shipment) => {
                  const status = getStatusBadge(shipment.status)
                  return (
                    <Link
                      key={shipment._id}
                      to={`/shipments/${shipment._id}`}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div>
                        <div className="flex items-center space-x-3">
                          <span className="font-medium text-gray-900">{shipment.containerNumber}</span>
                          <span className={status.className}>{status.label}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          {shipment.origin} → {shipment.destination}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">
                          ETA: {formatDistanceToNow(new Date(shipment.eta), { addSuffix: true })}
                        </p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Notifications & Quick Actions */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="card-body">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  to="/documents"
                  className="flex flex-col items-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition"
                >
                  <Upload className="w-6 h-6 text-primary-500 mb-2" />
                  <span className="text-sm font-medium text-primary-700">Upload Doc</span>
                </Link>
                <button className="flex flex-col items-center p-4 bg-accent-50 rounded-lg hover:bg-accent-100 transition">
                  <MessageSquare className="w-6 h-6 text-accent-500 mb-2" />
                  <span className="text-sm font-medium text-accent-700">Message</span>
                </button>
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="card">
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              <Link to="/notifications" className="text-primary-600 hover:text-primary-700 text-sm">
                View All
              </Link>
            </div>
            <div className="card-body">
              {notifications.length === 0 ? (
                <div className="text-center py-6 text-gray-500">
                  <AlertCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No new notifications</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 3).map((notification: any) => (
                    <div key={notification._id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="w-2 h-2 bg-primary-500 rounded-full mt-2" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-900">{notification.title}</p>
                        <p className="text-xs text-gray-500">{notification.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
