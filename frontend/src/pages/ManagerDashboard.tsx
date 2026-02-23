import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Package, 
  DollarSign, 
  Users, 
  Star, 
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  BarChart3
} from 'lucide-react'
import { dashboardApi, shipmentsApi } from '../services/api'
import { format } from 'date-fns'

interface DashboardData {
  shipments: {
    total: number
    onSea: number
    atMombasa: number
    completed: number
  }
  invoices: {
    pending: number
    paid: number
    overdue: number
  }
  clients: {
    total: number
  }
  recentShipments: any[]
  attentionShipments: any[]
}

const ManagerDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [invoiceCollection, setInvoiceCollection] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true)
      
      const [overviewRes, invoiceRes] = await Promise.all([
        dashboardApi.getOverview(),
        dashboardApi.getInvoiceCollection()
      ])
      
      setData(overviewRes.data.data)
      setInvoiceCollection(invoiceRes.data.data)
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
      payment_pending: { label: 'Payment Due', className: 'badge-red' },
      completed: { label: 'Completed', className: 'badge-green' },
    }
    return statusMap[status] || { label: status, className: 'badge-blue' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-500">Operations Overview</p>
        </div>
        <Link to="/dashboard/performance" className="btn-primary flex items-center">
          <BarChart3 className="w-5 h-5 mr-2" />
          Analytics
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card">
          <div className="h-1 bg-primary-500 rounded-t-xl" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Shipments</p>
                <p className="text-2xl font-bold text-gray-900">{data?.shipments.total || 0}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +5 this week
                </p>
              </div>
              <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                <Package className="w-6 h-6 text-primary-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="h-1 bg-green-500 rounded-t-xl" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Completed (MTD)</p>
                <p className="text-2xl font-bold text-gray-900">{data?.shipments.completed || 0}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +12% vs last month
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="h-1 bg-accent-500 rounded-t-xl" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Invoice Collection</p>
                <p className="text-2xl font-bold text-gray-900">
                  {invoiceCollection?.summary.percentage || 0}%
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {invoiceCollection?.summary.totalUploaded || 0}/{invoiceCollection?.summary.totalRequired || 0} collected
                </p>
              </div>
              <div className="w-12 h-12 bg-accent-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-accent-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="h-1 bg-yellow-500 rounded-t-xl" />
          <div className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Clients</p>
                <p className="text-2xl font-bold text-gray-900">{data?.clients.total || 0}</p>
                <p className="text-xs text-green-600 flex items-center mt-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +3 new this month
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Collection Status */}
      <div className="card">
        <div className="card-header bg-accent-50 border-accent-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-accent-500 mr-2" />
              <h2 className="text-lg font-semibold text-accent-700">Invoice Collection Status</h2>
            </div>
            <span className="text-sm text-accent-600">
              {invoiceCollection?.summary.percentage || 0}% Complete
            </span>
          </div>
        </div>
        <div className="card-body">
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-4 mb-6">
            <div 
              className="bg-accent-500 h-4 rounded-full transition-all"
              style={{ width: `${invoiceCollection?.summary.percentage || 0}%` }}
            />
          </div>

          {invoiceCollection?.shipments?.length === 0 ? (
            <p className="text-gray-500 text-center py-4">All invoices collected!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-4 font-medium text-gray-500">Container</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-500">Clients</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-500">Missing</th>
                    <th className="text-left py-2 px-4 font-medium text-gray-500">ETA</th>
                    <th className="text-right py-2 px-4 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceCollection?.shipments?.slice(0, 5).map((item: any) => (
                    <tr key={item.containerNumber} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{item.containerNumber}</td>
                      <td className="py-3 px-4">{item.clients}</td>
                      <td className="py-3 px-4 text-red-600">{item.missing} invoices</td>
                      <td className="py-3 px-4">
                        {item.daysRemaining > 0 
                          ? `${item.daysRemaining} days` 
                          : <span className="text-red-600">Overdue</span>
                        }
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button className="text-primary-600 hover:text-primary-700 text-sm">
                          Remind
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attention Required */}
        <div className="card">
          <div className="card-header bg-red-50 border-red-200">
            <div className="flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-500 mr-2" />
              <h2 className="text-lg font-semibold text-red-700">Shipments Requiring Attention</h2>
            </div>
          </div>
          <div className="card-body">
            {data?.attentionShipments?.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="text-gray-500">No urgent items</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.attentionShipments?.map((shipment: any) => (
                  <Link
                    key={shipment._id}
                    to={`/shipments/${shipment._id}`}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{shipment.containerNumber}</p>
                      <p className="text-sm text-red-600">{shipment.issue || 'Action required'}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Recent Shipments</h2>
          </div>
          <div className="card-body">
            {isLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : data?.recentShipments?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent activity</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data?.recentShipments?.map((shipment: any) => {
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
                          {shipment.clients?.[0]?.company || 'N/A'}
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
    </div>
  )
}

export default ManagerDashboard