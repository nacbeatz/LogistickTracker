import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ship, Plus, X, Search } from 'lucide-react'
import { shipmentsApi, usersApi } from '../services/api'

interface ClientOption {
  _id: string
  name: string
  company: string
  email: string
}

const shippingLines = [
  { value: 'ONE', label: 'ONE (Ocean Network Express)' },
  { value: 'COSCO', label: 'COSCO Shipping' },
  { value: 'MSC', label: 'MSC (Mediterranean Shipping)' },
  { value: 'MAERSK', label: 'Maersk Line' },
  { value: 'CMA_CGM', label: 'CMA CGM' },
  { value: 'EVERGREEN', label: 'Evergreen Marine' },
  { value: 'HAPAG_LLOYD', label: 'Hapag-Lloyd' },
  { value: 'OTHER', label: 'Other' },
]

const containerTypes = [
  { value: '20ft_standard', label: "20' Standard" },
  { value: '40ft_standard', label: "40' Standard" },
  { value: '40ft_high_cube', label: "40' High Cube" },
  { value: '20ft_reefer', label: "20' Reefer" },
  { value: '40ft_reefer', label: "40' Reefer" },
]

const NewShipment = () => {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDropdown, setShowClientDropdown] = useState(false)

  const [form, setForm] = useState({
    containerNumber: '',
    blNumber: '',
    shippingLine: 'MSC',
    vesselName: '',
    etd: '',
    eta: '',
    origin: '',
    destination: 'Kigali, Rwanda',
    shipmentType: 'FCL',
    containerType: '40ft_standard',
    weight: '',
    cargoDescription: '',
    clients: [] as string[],
    notes: '',
  })

  const [selectedClients, setSelectedClients] = useState<ClientOption[]>([])

  useEffect(() => {
    fetchClients()
  }, [])

  const fetchClients = async () => {
    try {
      const response = await usersApi.getClients()
      setClients(response.data.data.clients)
    } catch (err) {
      console.error('Failed to fetch clients:', err)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const addClient = (client: ClientOption) => {
    if (!selectedClients.find(c => c._id === client._id)) {
      setSelectedClients(prev => [...prev, client])
      setForm(prev => ({ ...prev, clients: [...prev.clients, client._id] }))
    }
    setClientSearch('')
    setShowClientDropdown(false)
  }

  const removeClient = (clientId: string) => {
    setSelectedClients(prev => prev.filter(c => c._id !== clientId))
    setForm(prev => ({ ...prev, clients: prev.clients.filter(id => id !== clientId) }))
  }

  const filteredClients = clients.filter(c =>
    (c.name.toLowerCase().includes(clientSearch.toLowerCase()) ||
     c.company?.toLowerCase().includes(clientSearch.toLowerCase()) ||
     c.email.toLowerCase().includes(clientSearch.toLowerCase())) &&
    !selectedClients.find(sc => sc._id === c._id)
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const payload = {
        ...form,
        weight: form.weight ? Number(form.weight) : undefined,
      }
      await shipmentsApi.create(payload)
      navigate('/shipments')
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create shipment')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
          <Ship className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">New Shipment</h1>
          <p className="text-gray-500">Create a new container shipment</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Container Details */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Container Details</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Container Number *
              </label>
              <input
                type="text"
                name="containerNumber"
                value={form.containerNumber}
                onChange={handleChange}
                className="input uppercase"
                placeholder="MSCU1234567"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BL Number
              </label>
              <input
                type="text"
                name="blNumber"
                value={form.blNumber}
                onChange={handleChange}
                className="input"
                placeholder="BL Number"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipping Line *
              </label>
              <select
                name="shippingLine"
                value={form.shippingLine}
                onChange={handleChange}
                className="input"
                required
              >
                {shippingLines.map(sl => (
                  <option key={sl.value} value={sl.value}>{sl.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vessel Name
              </label>
              <input
                type="text"
                name="vesselName"
                value={form.vesselName}
                onChange={handleChange}
                className="input"
                placeholder="Vessel name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Container Type
              </label>
              <select
                name="containerType"
                value={form.containerType}
                onChange={handleChange}
                className="input"
              >
                {containerTypes.map(ct => (
                  <option key={ct.value} value={ct.value}>{ct.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Shipment Type
              </label>
              <select
                name="shipmentType"
                value={form.shipmentType}
                onChange={handleChange}
                className="input"
              >
                <option value="FCL">FCL (Full Container Load)</option>
                <option value="LCL">LCL (Less than Container Load)</option>
                <option value="groupage">Groupage</option>
              </select>
            </div>
          </div>
        </div>

        {/* Route & Dates */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Route & Schedule</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Origin *
              </label>
              <input
                type="text"
                name="origin"
                value={form.origin}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Shanghai, China"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Destination *
              </label>
              <input
                type="text"
                name="destination"
                value={form.destination}
                onChange={handleChange}
                className="input"
                placeholder="e.g., Kigali, Rwanda"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ETD (Estimated Departure) *
              </label>
              <input
                type="date"
                name="etd"
                value={form.etd}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ETA (Estimated Arrival) *
              </label>
              <input
                type="date"
                name="eta"
                value={form.eta}
                onChange={handleChange}
                className="input"
                required
              />
            </div>
          </div>
        </div>

        {/* Cargo Information */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Cargo Information</h2>
          </div>
          <div className="card-body grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                name="weight"
                value={form.weight}
                onChange={handleChange}
                className="input"
                placeholder="0"
                min="0"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cargo Description
              </label>
              <textarea
                name="cargoDescription"
                value={form.cargoDescription}
                onChange={handleChange}
                className="input min-h-[80px]"
                placeholder="Describe the cargo contents..."
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* Assign Clients */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Assign Clients</h2>
          </div>
          <div className="card-body space-y-4">
            <div className="relative">
              <div className="flex items-center border border-gray-300 rounded-lg px-3">
                <Search className="w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={clientSearch}
                  onChange={(e) => {
                    setClientSearch(e.target.value)
                    setShowClientDropdown(true)
                  }}
                  onFocus={() => setShowClientDropdown(true)}
                  className="w-full px-3 py-2 border-0 focus:outline-none focus:ring-0"
                  placeholder="Search clients by name, company, or email..."
                />
              </div>

              {showClientDropdown && clientSearch && filteredClients.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredClients.map(client => (
                    <button
                      key={client._id}
                      type="button"
                      onClick={() => addClient(client)}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-sm text-gray-500">{client.company} - {client.email}</p>
                      </div>
                      <Plus className="w-4 h-4 text-primary-500" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedClients.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedClients.map(client => (
                  <div
                    key={client._id}
                    className="flex items-center space-x-2 bg-primary-50 text-primary-700 px-3 py-1.5 rounded-full text-sm"
                  >
                    <span>{client.name} ({client.company})</span>
                    <button
                      type="button"
                      onClick={() => removeClient(client._id)}
                      className="text-primary-500 hover:text-primary-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Additional Notes</h2>
          </div>
          <div className="card-body">
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              className="input min-h-[80px]"
              placeholder="Any additional notes about this shipment..."
              rows={3}
            />
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/shipments')}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary"
          >
            {isSubmitting ? 'Creating...' : 'Create Shipment'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewShipment
