import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  FileText,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  Plus,
  Upload,
  Users,
  Ship,
} from 'lucide-react'
import { dashboardApi, shipmentsApi } from '../services/api'
import { formatDistanceToNow } from 'date-fns'

interface DashboardStats {
  shipments: { total: number; onSea: number; atMombasa: number; completed: number }
  documents: { pending: number; verified: number }
  tasks: { pending: number; inProgress: number }
}

interface Shipment {
  _id: string
  containerNumber: string
  status: string
  eta: string
  clients: Array<{ name: string; company: string }>
}

const statusConfig: Record<string, { label: string; badge: string; dot: string }> = {
  on_sea:          { label: 'On Sea',      badge: 'bg-primary-100 text-primary-700', dot: 'bg-primary-500' },
  arrived_mombasa: { label: 'Arrived',     badge: 'bg-accent-100 text-accent-700',   dot: 'bg-accent-500' },
  discharged:      { label: 'Discharged',  badge: 'bg-primary-50 text-primary-600',  dot: 'bg-primary-300' },
  payment_pending: { label: 'Payment Due', badge: 'bg-accent-100 text-accent-700',   dot: 'bg-accent-500' },
  in_transit:      { label: 'In Transit',  badge: 'bg-primary-100 text-primary-600', dot: 'bg-primary-400' },
  completed:       { label: 'Completed',   badge: 'bg-primary-100 text-primary-800', dot: 'bg-primary-700' },
}

const getStatus = (s: string) =>
  statusConfig[s] || { label: s, badge: 'bg-primary-50 text-primary-600', dot: 'bg-primary-300' }

const StaffDashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentShipments, setRecentShipments] = useState<Shipment[]>([])
  const [attentionShipments, setAttentionShipments] = useState<Shipment[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      const overviewRes = await dashboardApi.getOverview()
      setStats(overviewRes.data.data)
      const shipmentsRes = await shipmentsApi.getAll({ limit: 5 })
      setRecentShipments(shipmentsRes.data.data.shipments)
      setAttentionShipments(overviewRes.data.data.attentionShipments || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const statCards = [
    { label: 'Total Shipments', value: stats?.shipments.total     ?? 0, icon: Package,     accent: false },
    { label: 'On Sea',          value: stats?.shipments.onSea     ?? 0, icon: Ship,        accent: false },
    { label: 'Pending Docs',    value: stats?.documents.pending   ?? 0, icon: FileText,    accent: true  },
    { label: 'Completed',       value: stats?.shipments.completed ?? 0, icon: CheckCircle, accent: false },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Staff Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">China Office — Operations</p>
        </div>
        <Link
          to="/shipments/new"
          className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <Plus className="w-4 h-4" />
          <span>New Shipment</span>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
              </div>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                card.accent ? 'bg-accent-50' : 'bg-primary-50'
              }`}>
                <card.icon className={`w-5 h-5 ${card.accent ? 'text-accent-500' : 'text-primary-500'}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attention Required */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center space-x-3 px-6 py-4 bg-accent-50 border-b border-accent-100">
            <AlertTriangle className="w-4 h-4 text-accent-500 flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-accent-800">Attention Required</h2>
              <p className="text-xs text-accent-400">
                {attentionShipments.length} item{attentionShipments.length !== 1 ? 's' : ''} need action
              </p>
            </div>
          </div>
          <div className="p-4">
            {attentionShipments.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-8 h-8 text-primary-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No urgent items</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {attentionShipments.map((shipment) => (
                  <Link
                    key={shipment._id}
                    to={`/shipments/${shipment._id}`}
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-accent-50 rounded-xl transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-accent-500 rounded-full" />
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{shipment.containerNumber}</p>
                        <p className="text-xs text-accent-500 mt-0.5">
                          ETA: {formatDistanceToNow(new Date(shipment.eta), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-accent-400 transition" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="bg-white rounded-2xl border border-gray-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900">Recent Shipments</h2>
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
            ) : recentShipments.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No recent shipments</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {recentShipments.map((shipment) => {
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
                          <p className="text-xs text-gray-400 mt-0.5 truncate">
                            {shipment.clients[0]?.company || 'N/A'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-200 group-hover:text-gray-400 transition flex-shrink-0" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { to: '/shipments/new', icon: Plus,    label: 'New Shipment', accent: false },
            { to: '/documents',     icon: Upload,  label: 'Upload Doc',   accent: true  },
            { to: '/shipments',     icon: Package, label: 'All Shipments',accent: false },
            { to: '/users',         icon: Users,   label: 'Clients',      accent: true  },
          ].map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className={`flex flex-col items-center p-4 rounded-xl transition ${
                action.accent
                  ? 'bg-accent-50 hover:bg-accent-100'
                  : 'bg-primary-50 hover:bg-primary-100'
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${
                action.accent ? 'bg-accent-100' : 'bg-primary-100'
              }`}>
                <action.icon className={`w-5 h-5 ${action.accent ? 'text-accent-600' : 'text-primary-600'}`} />
              </div>
              <span className={`text-sm font-semibold ${action.accent ? 'text-accent-700' : 'text-primary-700'}`}>
                {action.label}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default StaffDashboard
