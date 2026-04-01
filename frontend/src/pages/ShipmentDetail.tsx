import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Package, Ship, Anchor, CheckCircle, Clock, MapPin, Calendar,
  FileText, Upload, MessageSquare, Star, AlertTriangle, ChevronLeft,
  Download, Lock, Send, DollarSign, CreditCard
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { shipmentsApi, documentsApi, ratingsApi, messagesApi, invoicesApi } from '../services/api'
import { format, formatDistanceToNow } from 'date-fns'

interface Shipment {
  _id: string
  containerNumber: string
  blNumber?: string
  shippingLine: string
  vesselName?: string
  etd: string
  eta: string
  actualArrival?: string
  status: string
  origin: string
  destination: string
  shipmentType: string
  containerType: string
  weight?: number
  cargoDescription?: string
  clients: Array<{ _id: string; name: string; company: string; email: string }>
  assignedStaff?: { _id: string; name: string }
  createdAt: string
}

interface Doc {
  _id: string
  type: string
  originalName: string
  status: string
  isLocked: boolean
  uploadedBy: { name: string }
  createdAt: string
}

interface Message {
  _id: string
  content: string
  sender: { _id: string; name: string; role: string }
  type: string
  createdAt: string
}

const STATUS_LABELS: Record<string, string> = {
  created: 'Created', on_sea: 'On Sea', arrived_mombasa: 'Arrived Mombasa',
  discharged: 'Discharged', documents_ready: 'Docs Ready', payment_pending: 'Payment Pending',
  payment_received: 'Payment Received', cleared: 'Cleared', in_transit: 'In Transit',
  at_warehouse: 'At Warehouse', delivered: 'Delivered', completed: 'Completed',
}

const NEXT_STATUS: Record<string, string> = {
  created: 'on_sea', on_sea: 'arrived_mombasa', arrived_mombasa: 'discharged',
  discharged: 'documents_ready', documents_ready: 'payment_pending',
  payment_pending: 'payment_received', payment_received: 'cleared',
  cleared: 'in_transit', in_transit: 'at_warehouse', at_warehouse: 'delivered',
  delivered: 'completed',
}

const ShipmentDetail = () => {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuthStore()
  const [shipment, setShipment] = useState<Shipment | null>(null)
  const [documents, setDocuments] = useState<Doc[]>([])
  const [statusHistory, setStatusHistory] = useState<any[]>([])
  const [invoices, setInvoices] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'timeline' | 'messages' | 'invoices'>('overview')

  // Rating state
  const [myRating, setMyRating] = useState<any>(null)
  const [ratingForm, setRatingForm] = useState({ rating: 5, comment: '' })
  const [ratingLoading, setRatingLoading] = useState(false)

  // Message state
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [msgLoading, setMsgLoading] = useState(false)

  // Status update
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')

  useEffect(() => { if (id) fetchAll() }, [id])

  const fetchAll = async () => {
    try {
      setIsLoading(true)
      const res = await shipmentsApi.getById(id!)
      setShipment(res.data.data.shipment)
      setDocuments(res.data.data.documents || [])
      setStatusHistory(res.data.data.statusHistory || [])
      setInvoices(res.data.data.invoices || [])

      if (res.data.data.shipment.status === 'completed' && user?.role === 'client') {
        const rRes = await ratingsApi.getForShipment(id!)
        setMyRating(rRes.data.data.myRating)
      }
    } catch (error) {
      console.error('Failed to fetch shipment:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMessages = async () => {
    try {
      const res = await messagesApi.getForShipment(id!)
      setMessages(res.data.data.messages)
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    }
  }

  useEffect(() => { if (activeTab === 'messages' && id) fetchMessages() }, [activeTab, id])

  const handleAdvanceStatus = async () => {
    if (!shipment) return
    const next = NEXT_STATUS[shipment.status]
    if (!next) return
    setStatusLoading(true)
    setStatusError('')
    try {
      await shipmentsApi.updateStatus(shipment._id, next)
      await fetchAll()
    } catch (err: any) {
      setStatusError(err.response?.data?.message || 'Failed to update status')
    } finally {
      setStatusLoading(false)
    }
  }

  const handleSubmitRating = async () => {
    if (!id) return
    setRatingLoading(true)
    try {
      const res = await ratingsApi.create({ shipment: id, ...ratingForm })
      setMyRating(res.data.data.rating)
    } catch (error: any) {
      console.error('Rating failed:', error)
    } finally {
      setRatingLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!id || !newMessage.trim()) return
    setMsgLoading(true)
    try {
      await messagesApi.send({ shipment: id, content: newMessage })
      setNewMessage('')
      fetchMessages()
    } catch (error) {
      console.error('Send message failed:', error)
    } finally {
      setMsgLoading(false)
    }
  }

  const getDocumentLabel = (type: string) => {
    const labels: Record<string, string> = {
      commercial_invoice: 'Commercial Invoice', packing_list: 'Packing List',
      bill_of_lading: 'Bill of Lading', sea_freight_invoice: 'Sea Freight Invoice',
      t1: 'T1 Document', im4: 'IM4', delivery_note: 'Delivery Note',
      import_permit: 'Import Permit', certificate_of_origin: 'Certificate of Origin',
      payment_receipt: 'Payment Receipt', loa: 'LOA',
    }
    return labels[type] || type.replace(/_/g, ' ')
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!shipment) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-900">Shipment not found</h2>
        <Link to="/shipments" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">Back to Shipments</Link>
      </div>
    )
  }

  const steps = [
    { key: 'created', label: 'Created', icon: Package },
    { key: 'on_sea', label: 'On Sea', icon: Ship },
    { key: 'arrived_mombasa', label: 'Arrived', icon: Anchor },
    { key: 'discharged', label: 'Discharged', icon: Package },
    { key: 'documents_ready', label: 'Docs Ready', icon: FileText },
    { key: 'payment_pending', label: 'Payment', icon: DollarSign },
    { key: 'payment_received', label: 'Paid', icon: CreditCard },
    { key: 'cleared', label: 'Cleared', icon: CheckCircle },
    { key: 'in_transit', label: 'In Transit', icon: Ship },
    { key: 'at_warehouse', label: 'Warehouse', icon: Package },
    { key: 'delivered', label: 'Delivered', icon: CheckCircle },
    { key: 'completed', label: 'Completed', icon: CheckCircle },
  ]
  const currentIndex = steps.findIndex(s => s.key === shipment.status)
  const nextStatus = NEXT_STATUS[shipment.status]
  const isStaff = user?.role !== 'client'

  const tabs = ['overview', 'documents', 'invoices', 'messages', 'timeline'] as const

  return (
    <div className="space-y-6">
      <Link to="/shipments" className="inline-flex items-center text-gray-500 hover:text-gray-700">
        <ChevronLeft className="w-4 h-4 mr-1" /> Back to Shipments
      </Link>

      {/* Header */}
      <div className="card">
        <div className="h-1 bg-primary-500 rounded-t-xl" />
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">{shipment.containerNumber}</h1>
                <span className="badge-blue">{STATUS_LABELS[shipment.status] || shipment.status}</span>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                <span className="flex items-center"><Ship className="w-4 h-4 mr-1" />{shipment.shippingLine}</span>
                {shipment.vesselName && <span>Vessel: {shipment.vesselName}</span>}
                <span className="flex items-center"><MapPin className="w-4 h-4 mr-1" />{shipment.origin} → {shipment.destination}</span>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">ETA</p>
                <p className="text-lg font-semibold text-primary-600">
                  {formatDistanceToNow(new Date(shipment.eta), { addSuffix: true })}
                </p>
                <p className="text-sm text-gray-400">{format(new Date(shipment.eta), 'MMM dd, yyyy')}</p>
              </div>
              {isStaff && nextStatus && (
                <button onClick={handleAdvanceStatus} disabled={statusLoading}
                  className="btn-primary whitespace-nowrap">
                  {statusLoading ? 'Updating...' : `→ ${STATUS_LABELS[nextStatus]}`}
                </button>
              )}
            </div>
          </div>
          {statusError && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">{statusError}</div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {tabs.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* ─── OVERVIEW TAB ─── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 card">
            <div className="card-header"><h2 className="text-lg font-semibold text-gray-900">Shipment Timeline</h2></div>
            <div className="card-body">
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
                <div className="space-y-4">
                  {steps.map((step, index) => {
                    const isCompleted = index <= currentIndex
                    const isCurrent = index === currentIndex
                    const StepIcon = step.icon
                    return (
                      <div key={step.key} className="relative flex items-start">
                        <div className={`absolute left-4 w-8 h-8 -ml-4 rounded-full flex items-center justify-center border-2 ${
                          isCompleted ? 'bg-primary-500 border-primary-500 text-white' : 'bg-white border-gray-300 text-gray-400'
                        } ${isCurrent ? 'ring-4 ring-primary-100' : ''}`}>
                          <StepIcon className="w-4 h-4" />
                        </div>
                        <div className="ml-10">
                          <p className={`font-medium ${isCompleted ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</p>
                          {isCurrent && <p className="text-sm text-primary-600">Current Status</p>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card">
              <div className="card-header"><h2 className="text-lg font-semibold text-gray-900">Details</h2></div>
              <div className="card-body space-y-3">
                <div><p className="text-sm text-gray-500">Container Type</p><p className="font-medium">{shipment.containerType.replace(/_/g, ' ')}</p></div>
                <div><p className="text-sm text-gray-500">Shipment Type</p><p className="font-medium">{shipment.shipmentType}</p></div>
                {shipment.weight ? <div><p className="text-sm text-gray-500">Weight</p><p className="font-medium">{shipment.weight.toLocaleString()} kg</p></div> : null}
                {shipment.cargoDescription && <div><p className="text-sm text-gray-500">Cargo</p><p className="font-medium">{shipment.cargoDescription}</p></div>}
                <div><p className="text-sm text-gray-500">ETD</p><p className="font-medium">{format(new Date(shipment.etd), 'MMM dd, yyyy')}</p></div>
                {shipment.actualArrival && <div><p className="text-sm text-gray-500">Actual Arrival</p><p className="font-medium">{format(new Date(shipment.actualArrival), 'MMM dd, yyyy')}</p></div>}
              </div>
            </div>

            {/* Rating section for completed shipments */}
            {shipment.status === 'completed' && user?.role === 'client' && (
              <div className="card">
                <div className="card-header"><h2 className="text-lg font-semibold text-gray-900">Rate Service</h2></div>
                <div className="card-body">
                  {myRating ? (
                    <div className="text-center">
                      <div className="flex justify-center mb-2">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-6 h-6 ${s <= myRating.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`} />
                        ))}
                      </div>
                      <p className="text-sm text-gray-500">Thank you for your rating!</p>
                      {myRating.comment && <p className="text-sm text-gray-600 mt-2">"{myRating.comment}"</p>}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex justify-center">
                        {[1,2,3,4,5].map(s => (
                          <button key={s} onClick={() => setRatingForm(p => ({ ...p, rating: s }))}>
                            <Star className={`w-8 h-8 cursor-pointer transition ${s <= ratingForm.rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300 hover:text-yellow-300'}`} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={ratingForm.comment}
                        onChange={e => setRatingForm(p => ({ ...p, comment: e.target.value }))}
                        className="input" rows={2} placeholder="Leave a comment (optional)"
                      />
                      <button onClick={handleSubmitRating} disabled={ratingLoading} className="w-full btn-accent">
                        {ratingLoading ? 'Submitting...' : 'Submit Rating'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── DOCUMENTS TAB ─── */}
      {activeTab === 'documents' && (
        <div className="card">
          <div className="card-header flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Documents</h2>
            <Link to={`/documents?shipment=${shipment._id}`} className="btn-primary text-sm flex items-center">
              <Upload className="w-4 h-4 mr-2" /> Upload
            </Link>
          </div>
          <div className="card-body">
            {documents.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No documents yet</h3>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {documents.map(doc => (
                  <div key={doc._id} className="p-4 border border-gray-200 rounded-lg hover:border-primary-300 transition">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mr-3">
                          <FileText className="w-5 h-5 text-primary-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{getDocumentLabel(doc.type)}</p>
                          <p className="text-sm text-gray-500">{doc.originalName}</p>
                        </div>
                      </div>
                      {doc.isLocked && <span title="Locked until payment"><Lock className="w-4 h-4 text-red-400" /></span>}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <span className={`text-xs font-medium ${
                        doc.status === 'verified' ? 'text-green-600' : doc.status === 'rejected' ? 'text-red-600' : 'text-yellow-600'
                      }`}>
                        {doc.status.charAt(0).toUpperCase() + doc.status.slice(1)}
                      </span>
                      {doc.isLocked ? (
                        <span className="text-xs text-red-500 flex items-center"><Lock className="w-3 h-3 mr-1" />Pay to unlock</span>
                      ) : (
                        <button className="text-primary-600 hover:text-primary-700 text-sm flex items-center">
                          <Download className="w-4 h-4 mr-1" /> Download
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── INVOICES TAB ─── */}
      {activeTab === 'invoices' && (
        <div className="card">
          <div className="card-header"><h2 className="text-lg font-semibold text-gray-900">Invoices</h2></div>
          <div className="card-body">
            {invoices.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900">No invoices yet</h3>
                <p className="text-gray-500">Invoices will be generated when shipment arrives at port</p>
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((inv: any) => (
                  <div key={inv._id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{inv.invoiceNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                          inv.status === 'overdue' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                        }`}>{inv.status.toUpperCase()}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">
                        {inv.type?.replace(/_/g, ' ')} &bull; Due: {format(new Date(inv.dueDate), 'MMM dd, yyyy')}
                      </p>
                    </div>
                    <p className="text-lg font-bold">${inv.total?.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── MESSAGES TAB ─── */}
      {activeTab === 'messages' && (
        <div className="card">
          <div className="card-header"><h2 className="text-lg font-semibold text-gray-900">Messages</h2></div>
          <div className="card-body">
            <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
              {messages.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No messages yet. Start the conversation!</p>
                </div>
              ) : (
                messages.map(msg => {
                  const isMe = msg.sender?._id === user?._id
                  return (
                    <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        isMe ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-900'
                      }`}>
                        {!isMe && <p className="text-xs font-medium mb-1 opacity-75">{msg.sender?.name}</p>}
                        <p className="text-sm">{msg.content}</p>
                        <p className={`text-xs mt-1 ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                          {format(new Date(msg.createdAt), 'HH:mm')}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
            <div className="flex items-center space-x-2 border-t border-gray-200 pt-4">
              <input
                type="text" value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage() } }}
                className="input flex-1" placeholder="Type a message..."
              />
              <button onClick={handleSendMessage} disabled={msgLoading || !newMessage.trim()} className="btn-primary p-2.5">
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── TIMELINE TAB ─── */}
      {activeTab === 'timeline' && (
        <div className="card">
          <div className="card-header"><h2 className="text-lg font-semibold text-gray-900">Status History</h2></div>
          <div className="card-body">
            {statusHistory.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No status history available</p>
            ) : (
              <div className="space-y-4">
                {statusHistory.map((h, i) => (
                  <div key={i} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-lg">
                    <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        <span className="text-gray-500">{STATUS_LABELS[h.fromStatus] || h.fromStatus}</span>
                        {' → '}
                        <span className="text-primary-600">{STATUS_LABELS[h.toStatus] || h.toStatus}</span>
                      </p>
                      {h.notes && <p className="text-sm text-gray-500 mt-1">{h.notes}</p>}
                      <p className="text-xs text-gray-400 mt-2">
                        {format(new Date(h.createdAt), 'MMM dd, yyyy HH:mm')} by {h.changedBy?.name}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ShipmentDetail
