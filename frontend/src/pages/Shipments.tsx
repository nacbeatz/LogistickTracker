import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { 
  Package, 
  Search, 
  Filter, 
  ChevronRight,
  Plus,
  Ship,
  Anchor,
  CheckCircle
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { shipmentsApi } from '../services/api'
import { formatDistanceToNow } from 'date-fns'

interface Shipment {
  _id: string
  containerNumber: string
  status: string
  origin: string
  destination: string
  eta: string
  etd: string
  shippingLine: string
  clients: Array<{ _id: string; name: string; company: string }>
  createdAt: string
}

const Shipments = () => {
  const { user } = useAuthStore()
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [filteredShipments, setFilteredShipments] = useState<Shipment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    fetchShipments()
  }, [])

  useEffect(() => {
    filterShipments()
  }, [shipments, searchTerm, statusFilter])

  const fetchShipments = async () => {
    try {
      setIsLoading(true)
      const response = await shipmentsApi.getAll({ limit: 100 })
      setShipments(response.data.data.shipments)
    } catch (error) {
      console.error('Failed to fetch shipments:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filterShipments = () => {
    let filtered = shipments

    if (searchTerm) {
      filtered = filtered.filter(s => 
        s.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.destination.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(s => s.status === statusFilter)
    }

    setFilteredShipments(filtered)
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: any }> = {
      created: { label: 'Created', className: 'badge-blue', icon: Package },
      on_sea: { label: 'On Sea', className: 'badge-blue', icon: Ship },
      arrived_mombasa: { label: 'Arrived', className: 'badge-orange', icon: Anchor },
      discharged: { label: 'Discharged', className: 'badge-yellow', icon: Package },
      documents_ready: { label: 'Docs Ready', className: 'badge-yellow', icon: Package },
      payment_pending: { label: 'Payment Due', className: 'badge-red', icon: Package },
      payment_received: { label: 'Paid', className: 'badge-green', icon: CheckCircle },
      cleared: { label: 'Cleared', className: 'badge-green', icon: CheckCircle },
      in_transit: { label: 'In Transit', className: 'badge-yellow', icon: Ship },
      at_warehouse: { label: 'At Warehouse', className: 'badge-orange', icon: Package },
      delivered: { label: 'Delivered', className: 'badge-green', icon: CheckCircle },
      completed: { label: 'Completed', className: 'badge-green', icon: CheckCircle },
    }
    return statusMap[status] || { label: status, className: 'badge-blue', icon: Package }
  }

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'on_sea', label: 'On Sea' },
    { value: 'arrived_mombasa', label: 'At Mombasa' },
    { value: 'in_transit', label: 'In Transit' },
    { value: 'completed', label: 'Completed' },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shipments</h1>
          <p className="text-gray-500">Manage and track all shipments</p>
        </div>
        {user?.role !== 'client' && (
          <Link
            to="/shipments/new"
            className="btn-primary flex items-center"
          >
            <Plus className="w-5 h-5 mr-2" />
            New Shipment
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by container number, origin, destination..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Shipments List */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">
            All Shipments ({filteredShipments.length})
          </h2>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Loading shipments...</p>
            </div>
          ) : filteredShipments.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No shipments found</h3>
              <p className="text-gray-500">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your filters' 
                  : 'Get started by creating a new shipment'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Container</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Route</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">ETA</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Client</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredShipments.map((shipment) => {
                    const status = getStatusBadge(shipment.status)
                    const StatusIcon = status.icon
                    return (
                      <tr key={shipment._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-900">{shipment.containerNumber}</p>
                            <p className="text-sm text-gray-500">{shipment.shippingLine}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className={`${status.className} flex items-center w-fit`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {status.label}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-600">
                            {shipment.origin} → {shipment.destination}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-600">
                            {formatDistanceToNow(new Date(shipment.eta), { addSuffix: true })}
                          </p>
                        </td>
                        <td className="py-4 px-4">
                          <p className="text-sm text-gray-600">
                            {shipment.clients[0]?.company || shipment.clients[0]?.name || 'N/A'}
                          </p>
                        </td>
                        <td className="py-4 px-4 text-right">
                          <Link
                            to={`/shipments/${shipment._id}`}
                            className="inline-flex items-center text-primary-600 hover:text-primary-700"
                          >
                            View <ChevronRight className="w-4 h-4 ml-1" />
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Shipments