import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign,
  FileText,
  CheckCircle,
  Clock,
  AlertTriangle,
  ChevronRight,
  Filter,
  CreditCard
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { invoicesApi } from '../services/api'
import { format, formatDistanceToNow } from 'date-fns'

interface Invoice {
  _id: string
  invoiceNumber: string
  shipment: { _id: string; containerNumber: string; status: string }
  client: { _id: string; name: string; company: string }
  type: string
  total: number
  currency: string
  status: string
  issueDate: string
  dueDate: string
  paidAt?: string
  paidAmount?: number
  paymentMethod?: string
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  issued: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  cancelled: 'bg-gray-100 text-gray-500',
}

const typeLabels: Record<string, string> = {
  sea_freight: 'Sea Freight',
  clearance: 'Customs Clearance',
  transport: 'Transport',
  storage: 'Storage',
  handling: 'Handling',
  other: 'Other',
}

const Invoices = () => {
  const { user } = useAuthStore()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<any>({})
  const [statusFilter, setStatusFilter] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [payModal, setPayModal] = useState<Invoice | null>(null)
  const [payForm, setPayForm] = useState({ paidAmount: 0, paymentMethod: 'bank_transfer', paymentReference: '' })
  const [payLoading, setPayLoading] = useState(false)

  useEffect(() => { fetchInvoices() }, [statusFilter])

  const fetchInvoices = async () => {
    try {
      setIsLoading(true)
      const params: any = {}
      if (statusFilter) params.status = statusFilter
      const response = await invoicesApi.getAll(params)
      setInvoices(response.data.data.invoices)
      setSummary(response.data.data.summary || {})
    } catch (error) {
      console.error('Failed to fetch invoices:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePay = async () => {
    if (!payModal) return
    setPayLoading(true)
    try {
      await invoicesApi.pay(payModal._id, payForm)
      setPayModal(null)
      fetchInvoices()
    } catch (error) {
      console.error('Payment failed:', error)
    } finally {
      setPayLoading(false)
    }
  }

  const totalPending = (summary.issued?.total || 0) + (summary.pending?.total || 0)
  const totalPaid = summary.paid?.total || 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-gray-500">Manage invoices and payments</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Pending</p>
              <p className="text-2xl font-bold text-yellow-600">${totalPending.toLocaleString()}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Paid</p>
              <p className="text-2xl font-bold text-green-600">${totalPaid.toLocaleString()}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-2xl font-bold text-red-600">${(summary.overdue?.total || 0).toLocaleString()}</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-3">
        <Filter className="w-4 h-4 text-gray-400" />
        {['', 'issued', 'pending', 'paid', 'overdue', 'cancelled'].map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
              statusFilter === s ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {s || 'All'}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900">No invoices</h3>
              <p className="text-gray-500">No invoices found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {invoices.map(invoice => (
                <div
                  key={invoice._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary-500" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{invoice.invoiceNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[invoice.status]}`}>
                          {invoice.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {typeLabels[invoice.type] || invoice.type} &bull;{' '}
                        <Link to={`/shipments/${invoice.shipment?._id}`} className="text-primary-600 hover:underline">
                          {invoice.shipment?.containerNumber}
                        </Link>
                        {user?.role !== 'client' && (
                          <> &bull; {invoice.client?.name} ({invoice.client?.company})</>
                        )}
                      </p>
                      <p className="text-xs text-gray-400">
                        Due: {format(new Date(invoice.dueDate), 'MMM dd, yyyy')}
                        {invoice.paidAt && <> &bull; Paid: {format(new Date(invoice.paidAt), 'MMM dd, yyyy')}</>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-bold text-gray-900">
                        ${invoice.total.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-400">{invoice.currency}</p>
                    </div>
                    {['issued', 'pending'].includes(invoice.status) && user?.role !== 'client' && (
                      <button
                        onClick={() => { setPayModal(invoice); setPayForm({ paidAmount: invoice.total, paymentMethod: 'bank_transfer', paymentReference: '' }) }}
                        className="btn-primary text-sm flex items-center"
                      >
                        <CreditCard className="w-4 h-4 mr-1" />
                        Record Payment
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {payModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Record Payment</h2>
            <p className="text-sm text-gray-500 mb-4">
              Invoice: <strong>{payModal.invoiceNumber}</strong> &bull; Total: <strong>${payModal.total}</strong>
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount Paid ($)</label>
                <input
                  type="number"
                  value={payForm.paidAmount}
                  onChange={e => setPayForm(p => ({ ...p, paidAmount: Number(e.target.value) }))}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                <select
                  value={payForm.paymentMethod}
                  onChange={e => setPayForm(p => ({ ...p, paymentMethod: e.target.value }))}
                  className="input"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="mobile_money">Mobile Money</option>
                  <option value="cash">Cash</option>
                  <option value="check">Check</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reference Number</label>
                <input
                  type="text"
                  value={payForm.paymentReference}
                  onChange={e => setPayForm(p => ({ ...p, paymentReference: e.target.value }))}
                  className="input"
                  placeholder="Transaction reference"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setPayModal(null)} className="btn-secondary">Cancel</button>
              <button onClick={handlePay} disabled={payLoading} className="btn-primary">
                {payLoading ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Invoices
