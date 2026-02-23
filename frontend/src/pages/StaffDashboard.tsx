import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Package, 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  Clock,
  ChevronRight,
  Plus,
  Upload,
  Users
} from 'lucide-react'
import { dashboardApi, shipmentsApi } from '../services/api'
import { formatDistanceToNow } from 'date-fns'

interface DashboardStats {
  shipments: {
    total: number
    onSea: number
    atMombasa: number
    completed: number
  }
  documents: {
    pending: number
    verified: number
  }
  tasks: {
    pending: number
    inProgress: number
  }
}

interface Shipment {
  _id: string
  containerNumber: string
  status: string
  eta: string
  clients: Array<{ name: string; company: string }>
}

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
      
      // Fetch dashboard overview
      const overviewResponse = await dashboardApi.getOverview()
      setStats(overviewResponse.data.data)
      
      // Fetch recent shipments
      const shipmentsResponse = await shipmentsApi.getAll({ limit: 5 })
      setRecentShipments(shipmentsResponse.data.data.shipments)
      
      // Fetch attention shipments
      setAttentionShipments(overviewResponse.data.data.attentionShipments || [])
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      on_sea: { label: 'On Sea', className: 'badge-blue' },
      arrived_mombasa: { label: 'Arrived', className: 'badge-orange' },
      discharged: { label: 'Discharged', className: 'badge-yellow' },
      payment_pending: { label: 'Payment Due', className: 'badge-red' },
      in_transit: { label: 'In Transit', className: 'badge-yellow' },
      completed: { label: 'Completed', className: 'badge-green' },
    }
    return statusMap[status] || { label: status, className: 'badge-blue' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Staff Dashboard</h1>
          <p className="text-gray-500">China Office Operations</p>
        </div>
        <Link to="/shipments/new" className="btn-primary flex items-center">
          <Plus className="w-5 h-5 mr-2" />
          New Shipment
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="h-1 bg-primary-500 rounded-t-xl" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Shipments</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.shipments.total || 0}</p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-primary-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="h-1 bg-blue-500 rounded-t-xl" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">On Sea</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.shipments.onSea || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="h-1 bg-accent-500 rounded-t-xl" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Pending Docs</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.documents.pending || 0}</p>
              </div>
              <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-accent-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="h-1 bg-green-500 rounded-t-xl" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed</p>
                <p className="text-2xl font-bold text-gray-900">{stats?.shipments.completed || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attention Required */}
        <div className="card">
          <div className="card-header bg-red-50 border-red-200">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <h2 className="text-lg font-semibold text-red-700">Attention Required</h2>
            </div>
          </div>
          <div className="card-body">
            {attentionShipments.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="text-gray-500">No urgent items</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attentionShipments.map((shipment) => (
                  <Link
                    key={shipment._id}
                    to={`/shipments/${shipment._id}`}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{shipment.containerNumber}</p>
                      <p className="text-sm text-red-600">
                        ETA: {formatDistanceToNow(new Date(shipment.eta), { addSuffix: true })}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Shipments */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Recent Shipments</h2>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : recentShipments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent shipments</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentShipments.map((shipment) => {
                  const status = getStatusBadge(shipment.status)
                  return (
                    <Link
                      key={shipment._id}
                      to={`/shipments/${shipment._id}`}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{shipment.containerNumber}</span>
                          <span className={status.className}>{status.label}</span>
                        </div>
                        <p className="text-sm text-gray-500">
                          {shipment.clients[0]?.company || 'N/A'}
                        </p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-gray-400" />
                    </Link>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        </div>
        <div className="card-body">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link
              to="/shipments/new"
              className="flex flex-col items-center p-4 bg-primary-50 rounded-lg hover:bg-primary-100 transition"
            >
              <Plus className="w-8 h-8 text-primary-500 mb-2" />
              <span className="text-sm font-medium text-primary-700">New Shipment</span>
            </Link>
            <Link
              to="/documents"
              className="flex flex-col items-center p-4 bg-accent-50 rounded-lg hover:bg-accent-100 transition"
            >
              <Upload className="w-8 h-8 text-accent-500 mb-2" />
              <span className="text-sm font-medium text-accent-700">Upload Doc</span>
            </Link>
            <Link
              to="/shipments"
              className="flex flex-col items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition"
            >
              <Package className="w-8 h-8 text-blue-500 mb-2" />
              <span className="text-sm font-medium text-blue-700">View All</span>
            </Link>
            <Link
              to="/users"
              className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition"
            >
              <Users className="w-8 h-8 text-green-500 mb-2" />
              <span className="text-sm font-medium text-green-700">Clients</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default StaffDashboard