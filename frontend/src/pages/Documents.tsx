import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  FileText, 
  Upload, 
  Download, 
  CheckCircle, 
  XCircle,
  Lock,
  Search,
  Filter
} from 'lucide-react'
import { useAuthStore } from '../store/authStore'
import { documentsApi } from '../services/api'
import { format } from 'date-fns'

interface Document {
  _id: string
  type: string
  filename: string
  originalName: string
  status: string
  isLocked: boolean
  size: number
  uploadedBy: { name: string }
  createdAt: string
  shipment?: { containerNumber: string }
}

const Documents = () => {
  const { user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const shipmentId = searchParams.get('shipment')
  
  const [documents, setDocuments] = useState<Document[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [showUploadModal, setShowUploadModal] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [shipmentId])

  const fetchDocuments = async () => {
    try {
      setIsLoading(true)
      const params: any = {}
      if (shipmentId) params.shipment = shipmentId
      
      const response = await documentsApi.getAll(params)
      setDocuments(response.data.data.documents)
    } catch (error) {
      console.error('Failed to fetch documents:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const getDocumentIcon = (type: string) => {
    const icons: Record<string, any> = {
      commercial_invoice: FileText,
      packing_list: FileText,
      bill_of_lading: FileText,
      sea_freight_invoice: FileText,
    }
    return icons[type] || FileText
  }

  const getDocumentLabel = (type: string) => {
    const labels: Record<string, string> = {
      commercial_invoice: 'Commercial Invoice',
      packing_list: 'Packing List',
      bill_of_lading: 'Bill of Lading',
      sea_freight_invoice: 'Sea Freight Invoice',
      import_permit: 'Import Permit',
      certificate_of_origin: 'Certificate of Origin',
      payment_receipt: 'Payment Receipt',
    }
    return labels[type] || type.replace(/_/g, ' ')
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'badge-yellow' },
      uploaded: { label: 'Uploaded', className: 'badge-blue' },
      verified: { label: 'Verified', className: 'badge-green' },
      rejected: { label: 'Rejected', className: 'badge-red' },
      locked: { label: 'Locked', className: 'badge-orange' },
      unlocked: { label: 'Unlocked', className: 'badge-green' },
    }
    return statusMap[status] || { label: status, className: 'badge-blue' }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         getDocumentLabel(doc.type).toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = typeFilter === 'all' || doc.type === typeFilter
    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Documents</h1>
          <p className="text-gray-500">Manage shipment documents</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="btn-primary flex items-center"
        >
          <Upload className="w-5 h-5 mr-2" />
          Upload Document
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="commercial_invoice">Commercial Invoice</option>
                <option value="packing_list">Packing List</option>
                <option value="bill_of_lading">Bill of Lading</option>
                <option value="sea_freight_invoice">Sea Freight Invoice</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Documents List */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-lg font-semibold text-gray-900">
            All Documents ({filteredDocuments.length})
          </h2>
        </div>
        <div className="card-body">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Loading documents...</p>
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
              <p className="text-gray-500">Upload your first document to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Document</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Shipment</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Size</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-500">Uploaded</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-500">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredDocuments.map((doc) => {
                    const DocIcon = getDocumentIcon(doc.type)
                    const status = getStatusBadge(doc.status)
                    return (
                      <tr key={doc._id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center">
                            <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center mr-3">
                              <DocIcon className="w-5 h-5 text-primary-500" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{doc.originalName}</p>
                              <p className="text-sm text-gray-500">by {doc.uploadedBy?.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">{getDocumentLabel(doc.type)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {doc.shipment?.containerNumber || 'N/A'}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className={status.className}>{status.label}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">{formatFileSize(doc.size)}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600">
                            {format(new Date(doc.createdAt), 'MMM dd, yyyy')}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right">
                          {doc.isLocked ? (
                            <span className="inline-flex items-center text-gray-400 text-sm">
                              <Lock className="w-4 h-4 mr-1" />
                              Locked
                            </span>
                          ) : (
                            <button className="text-primary-600 hover:text-primary-700 text-sm flex items-center ml-auto">
                              <Download className="w-4 h-4 mr-1" />
                              Download
                            </button>
                          )}
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

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Upload Document</h2>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-primary-500 transition">
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-600 mb-2">Drag and drop files here, or click to browse</p>
                <p className="text-sm text-gray-400">PDF, JPG, PNG up to 10MB</p>
                <input type="file" className="hidden" />
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
                  <option>Commercial Invoice</option>
                  <option>Packing List</option>
                  <option>Bill of Lading</option>
                  <option>Payment Receipt</option>
                  <option>Other</option>
                </select>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              <button
                onClick={() => setShowUploadModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button className="btn-primary">Upload</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Documents