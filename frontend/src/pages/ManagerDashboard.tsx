import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Package,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle,
  ChevronRight,
  BarChart3,
  Ship,
  ArrowUpRight,
} from 'lucide-react'
import { dashboardApi } from '../services/api'

interface DashboardData {
  shipments: { total: number; onSea: number; atMombasa: number; completed: number }
  invoices: { pending: number; paid: number; overdue: number }
  clients: { total: number }
  recentShipments: any[]
  attentionShipments: any[]
}

const statusConfig: Record<string, { label: string; badge: string; dot: string }> = {
  on_sea:          { label: 'On Sea',      badge: 'bg-primary-100 text-primary-700', dot: 'bg-primary-500' },
  arrived_mombasa: { label: 'Arrived',     badge: 'bg-accent-100 text-accent-700',   dot: 'bg-accent-500'  },
  payment_pending: { label: 'Payment Due', badge: 'bg-accent-100 text-accent-700',   dot: 'bg-accent-500'  },
  completed:       { label: 'Completed',   badge: 'bg-primary-100 text-primary-800', dot: 'bg-primary-700' },
}

const getStatus = (s: string) =>
  statusConfig[s] || { label: s, badge: 'bg-primary-50 text-primary-600', dot: 'bg-primary-300' }

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
        dashboardApi.getInvoiceCollection(),
      ])
      setData(overviewRes.data.data)
      setInvoiceCollection(invoiceRes.data.data)
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const collectionPct = invoiceCollection?.summary?.percentage ?? 0

  const kpiCards = [
    { label: 'Active Shipments',    value: data?.shipments.total     ?? 0,  suffix: '',  icon: Package,    accent: false, sub: '+5 this week'      },
    { label: 'Completed (MTD)',      value: data?.shipments.completed ?? 0,  suffix: '',  icon: Ship,       accent: false, sub: '+12% vs last month' },
    { label: 'Invoice Collection',  value: collectionPct,                    suffix: '%', icon: DollarSign, accent: true,  sub: `${invoiceCollection?.summary?.totalUploaded ?? 0}/${invoiceCollection?.summary?.totalRequired ?? 0} collected` },
    { label: 'Total Clients',        value: data?.clients.total       ?? 0,  suffix: '',  icon: Users,      accent: false, sub: '+3 new this month'  },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manager Dashboard</h1>
          <p className="text-gray-400 text-sm mt-0.5">Operations Overview</p>
        </div>
        <Link
          to="/analytics"
          className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics</span>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="bg-white rounded-2xl p-5 border border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 font-medium">{card.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {card.value}{card.suffix}
                </p>
                <p className="text-xs text-gray-400 mt-1.5">{card.sub}</p>
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

      {/* Invoice Collection */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <DollarSign className="w-4 h-4 text-accent-500" />
            <div>
              <h2 className="text-sm font-bold text-gray-900">Invoice Collection</h2>
              <p className="text-xs text-gray-400 mt-0.5">Outstanding invoices per container</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            <span className="text-xl font-bold text-accent-600">{collectionPct}%</span>
            <ArrowUpRight className="w-4 h-4 text-accent-400" />
          </div>
        </div>
        <div className="px-6 py-4">
          {/* Progress */}
          <div className="flex items-center space-x-3 mb-5">
            <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-accent-500 rounded-full transition-all"
                style={{ width: `${collectionPct}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-gray-500 flex-shrink-0">
              {invoiceCollection?.summary?.totalUploaded ?? 0} / {invoiceCollection?.summary?.totalRequired ?? 0}
            </span>
          </div>

          {invoiceCollection?.shipments?.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm">All invoices collected</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Container', 'Clients', 'Missing', 'ETA', ''].map((h) => (
                      <th key={h} className={`py-2.5 px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === '' ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoiceCollection?.shipments?.slice(0, 5).map((item: any) => (
                    <tr key={item.containerNumber} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="py-3 px-3 font-semibold text-gray-900">{item.containerNumber}</td>
                      <td className="py-3 px-3 text-gray-500">{item.clients}</td>
                      <td className="py-3 px-3">
                        <span className="text-xs font-semibold text-accent-600 bg-accent-50 px-2 py-0.5 rounded-full">
                          {item.missing} missing
                        </span>
                      </td>
                      <td className="py-3 px-3 text-gray-500 text-xs">
                        {item.daysRemaining > 0 ? (
                          `${item.daysRemaining}d left`
                        ) : (
                          <span className="text-accent-600 font-semibold">Overdue</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button className="text-xs font-semibold text-primary-600 hover:text-primary-700 bg-primary-50 hover:bg-primary-100 px-3 py-1 rounded-lg transition">
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

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attention Required */}
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="flex items-center space-x-3 px-6 py-4 bg-accent-50 border-b border-accent-100">
            <AlertTriangle className="w-4 h-4 text-accent-500 flex-shrink-0" />
            <div>
              <h2 className="text-sm font-bold text-accent-800">Requires Attention</h2>
              <p className="text-xs text-accent-400">
                {data?.attentionShipments?.length ?? 0} shipment{(data?.attentionShipments?.length ?? 0) !== 1 ? 's' : ''} flagged
              </p>
            </div>
          </div>
          <div className="p-4">
            {data?.attentionShipments?.length === 0 ? (
              <div className="text-center py-10">
                <CheckCircle className="w-8 h-8 text-primary-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No urgent items</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data?.attentionShipments?.map((shipment: any) => (
                  <Link
                    key={shipment._id}
                    to={`/shipments/${shipment._id}`}
                    className="flex items-center justify-between py-3.5 px-2 hover:bg-accent-50 rounded-xl transition group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 bg-accent-500 rounded-full" />
                      <div>
                        <p className="font-semibold text-sm text-gray-900">{shipment.containerNumber}</p>
                        <p className="text-xs text-accent-500 mt-0.5">{shipment.issue || 'Action required'}</p>
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
            ) : data?.recentShipments?.length === 0 ? (
              <div className="text-center py-10">
                <Package className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                <p className="text-gray-400 text-sm">No recent activity</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {data?.recentShipments?.map((shipment: any) => {
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
                            {shipment.clients?.[0]?.company || 'N/A'}
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
    </div>
  )
}

export default ManagerDashboard
