import { useEffect, useState } from 'react'
import {
  Users, ClipboardList, Plus, CheckCircle, Clock,
  AlertTriangle, X, ChevronDown, User, Loader
} from 'lucide-react'
import { usersApi, tasksApi, shipmentsApi } from '../services/api'
import { format } from 'date-fns'

// ── Types ──────────────────────────────────────────────────────────
interface StaffUser {
  _id: string
  name: string
  email: string
  role: string
  company?: string
  isActive: boolean
}

interface Task {
  _id: string
  title: string
  type: string
  status: string
  priority: string
  dueDate?: string
  shipment?: { _id: string; containerNumber: string }
  assignedTo?: { _id: string; name: string }
  createdBy?: { _id: string; name: string }
  createdAt: string
}

interface Shipment {
  _id: string
  containerNumber: string
}

// ── Constants ──────────────────────────────────────────────────────
const TASK_TYPES = [
  { value: 'customs_clearance',  label: 'Customs Clearance' },
  { value: 'upload_invoice',     label: 'Upload Invoice' },
  { value: 'upload_document',    label: 'Upload Document' },
  { value: 'verify_document',    label: 'Verify Document' },
  { value: 'update_eta',         label: 'Update ETA' },
  { value: 'process_payment',    label: 'Process Payment' },
  { value: 'arrange_transport',  label: 'Arrange Transport' },
  { value: 'notify_client',      label: 'Notify Client' },
  { value: 'review_shipment',    label: 'Review Shipment' },
  { value: 'other',              label: 'Other' },
]

const ROLES = ['staff', 'manager']

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  low:    { label: 'Low',    className: 'bg-gray-100 text-gray-600' },
  medium: { label: 'Medium', className: 'bg-blue-100 text-blue-700' },
  high:   { label: 'High',   className: 'bg-orange-100 text-orange-700' },
  urgent: { label: 'Urgent', className: 'bg-red-100 text-red-700' },
}

const STATUS_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  pending:     { label: 'Pending',     className: 'bg-yellow-100 text-yellow-700', icon: Clock },
  in_progress: { label: 'In Progress', className: 'bg-blue-100 text-blue-700',    icon: Loader },
  completed:   { label: 'Completed',   className: 'bg-green-100 text-green-700',  icon: CheckCircle },
  cancelled:   { label: 'Cancelled',   className: 'bg-gray-100 text-gray-500',    icon: X },
}

// ── Small helpers ──────────────────────────────────────────────────
const Badge = ({ cfg }: { cfg: { label: string; className: string; icon?: any } }) => {
  const Icon = cfg.icon
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.className}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {cfg.label}
    </span>
  )
}

// ── Main page ──────────────────────────────────────────────────────
const TeamManagement = () => {
  const [tab, setTab] = useState<'staff' | 'tasks'>('staff')

  // Staff state
  const [staff, setStaff]         = useState<StaffUser[]>([])
  const [staffLoading, setStaffLoading] = useState(true)
  const [roleChanging, setRoleChanging] = useState<string | null>(null)

  // Task state
  const [tasks, setTasks]         = useState<Task[]>([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [showForm, setShowForm]   = useState(false)
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Task form
  const [form, setForm] = useState({
    shipment: '',
    assignedTo: '',
    type: 'customs_clearance',
    title: '',
    description: '',
    priority: 'medium',
    dueDate: '',
  })

  // ── Fetch data ───────────────────────────────────────────────────
  useEffect(() => { fetchStaff() }, [])
  useEffect(() => { if (tab === 'tasks') fetchTasks() }, [tab])

  useEffect(() => {
    shipmentsApi.getAll({ limit: 100 })
      .then(r => setShipments(r.data.data.shipments))
      .catch(() => {})
  }, [])

  const fetchStaff = async () => {
    setStaffLoading(true)
    try {
      const r = await usersApi.getAll({ role: 'staff' })
      const managers = await usersApi.getAll({ role: 'manager' })
      setStaff([...r.data.data.users, ...managers.data.data.users])
    } catch { /* silent */ } finally { setStaffLoading(false) }
  }

  const fetchTasks = async () => {
    setTasksLoading(true)
    try {
      const r = await tasksApi.getAll()
      setTasks(r.data.data.tasks)
    } catch { /* silent */ } finally { setTasksLoading(false) }
  }

  // ── Role change ──────────────────────────────────────────────────
  const handleRoleChange = async (userId: string, newRole: string) => {
    setRoleChanging(userId)
    try {
      await usersApi.update(userId, { role: newRole })
      setStaff(prev => prev.map(u => u._id === userId ? { ...u, role: newRole } : u))
    } catch { /* silent */ } finally { setRoleChanging(null) }
  }

  // ── Auto-fill title when type + shipment changes ─────────────────
  const autoTitle = (type: string, shipmentId: string) => {
    const typeLabel = TASK_TYPES.find(t => t.value === type)?.label || type
    const container = shipments.find(s => s._id === shipmentId)?.containerNumber || ''
    return container ? `${typeLabel} for ${container}` : typeLabel
  }

  const handleFormChange = (field: string, value: string) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value }
      if (field === 'type' || field === 'shipment') {
        updated.title = autoTitle(
          field === 'type' ? value : prev.type,
          field === 'shipment' ? value : prev.shipment
        )
      }
      return updated
    })
  }

  // ── Submit task ──────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!form.shipment)    { setFormError('Select a shipment.'); return }
    if (!form.assignedTo)  { setFormError('Select a staff member.'); return }
    if (!form.title.trim()) { setFormError('Title is required.'); return }

    setSubmitting(true)
    setFormError('')
    try {
      await tasksApi.create({
        shipment: form.shipment,
        assignedTo: form.assignedTo,
        type: form.type,
        title: form.title,
        description: form.description,
        priority: form.priority,
        dueDate: form.dueDate || undefined,
      })
      setShowForm(false)
      setForm({ shipment: '', assignedTo: '', type: 'customs_clearance', title: '', description: '', priority: 'medium', dueDate: '' })
      fetchTasks()
    } catch (e: any) {
      setFormError(e.response?.data?.message || 'Failed to create task.')
    } finally { setSubmitting(false) }
  }

  // ── Update task status ───────────────────────────────────────────
  const handleStatusChange = async (taskId: string, status: string) => {
    try {
      await tasksApi.updateStatus(taskId, status)
      setTasks(prev => prev.map(t => t._id === taskId ? { ...t, status } : t))
    } catch { /* silent */ }
  }

  // ── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Team Management</h1>
          <p className="text-gray-400 text-sm mt-0.5">Assign roles and tasks to staff</p>
        </div>
        {tab === 'tasks' && (
          <button
            onClick={() => { setShowForm(true); setFormError('') }}
            className="flex items-center space-x-2 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
          >
            <Plus className="w-4 h-4" />
            <span>Assign Task</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 bg-gray-100 p-1 rounded-xl w-fit">
        {([
          { key: 'staff', label: 'Staff & Roles', icon: Users },
          { key: 'tasks', label: 'Tasks',          icon: ClipboardList },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
              tab === t.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <t.icon className="w-4 h-4" />
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── STAFF & ROLES TAB ─────────────────────────────────────── */}
      {tab === 'staff' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-bold text-gray-900">Team Members</h2>
            <p className="text-xs text-gray-400 mt-0.5">Change a member's role using the dropdown</p>
          </div>

          {staffLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
            </div>
          ) : staff.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-400">No staff members found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Member', 'Email', 'Role', 'Status'].map(h => (
                      <th key={h} className="text-left py-3 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {staff.map(member => (
                    <tr key={member._id} className="hover:bg-gray-50 transition">
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-primary-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                            {member.company && <p className="text-xs text-gray-400">{member.company}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-sm text-gray-500">{member.email}</td>
                      <td className="py-4 px-6">
                        <div className="relative inline-block">
                          <select
                            value={member.role}
                            disabled={roleChanging === member._id}
                            onChange={e => handleRoleChange(member._id, e.target.value)}
                            className="appearance-none bg-primary-50 text-primary-700 text-xs font-semibold pl-3 pr-7 py-1.5 rounded-lg border border-primary-100 focus:outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer disabled:opacity-60"
                          >
                            {ROLES.map(r => (
                              <option key={r} value={r}>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                              </option>
                            ))}
                          </select>
                          {roleChanging === member._id ? (
                            <Loader className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary-500 animate-spin" />
                          ) : (
                            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-primary-400 pointer-events-none" />
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          member.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                        }`}>
                          {member.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── TASKS TAB ─────────────────────────────────────────────── */}
      {tab === 'tasks' && (
        <div className="space-y-5">

          {/* Assign Task form */}
          {showForm && (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">Assign New Task</h2>
                <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Shipment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Shipment <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.shipment}
                    onChange={e => handleFormChange('shipment', e.target.value)}
                    className="input"
                  >
                    <option value="">— Select shipment —</option>
                    {shipments.map(s => (
                      <option key={s._id} value={s._id}>{s.containerNumber}</option>
                    ))}
                  </select>
                </div>

                {/* Assign to */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Assign To <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.assignedTo}
                    onChange={e => handleFormChange('assignedTo', e.target.value)}
                    className="input"
                  >
                    <option value="">— Select staff member —</option>
                    {staff.map(u => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Task type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Task Type</label>
                  <select
                    value={form.type}
                    onChange={e => handleFormChange('type', e.target.value)}
                    className="input"
                  >
                    {TASK_TYPES.map(t => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                  <select
                    value={form.priority}
                    onChange={e => handleFormChange('priority', e.target.value)}
                    className="input"
                  >
                    {Object.entries(PRIORITY_CONFIG).map(([v, c]) => (
                      <option key={v} value={v}>{c.label}</option>
                    ))}
                  </select>
                </div>

                {/* Title — auto-filled, editable */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Task Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Customs Clearance for COSCO2468135"
                    className="input"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                  <textarea
                    rows={2}
                    value={form.description}
                    onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                    placeholder="Additional instructions for the staff member..."
                    className="input resize-none"
                  />
                </div>

                {/* Due date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date (optional)</label>
                  <input
                    type="date"
                    value={form.dueDate}
                    onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))}
                    className="input"
                  />
                </div>

                {/* Notification preview */}
                {form.assignedTo && form.shipment && (
                  <div className="sm:col-span-2 bg-primary-50 border border-primary-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-primary-700 mb-1 uppercase tracking-wide">Notification Preview</p>
                    <p className="text-sm font-bold text-primary-900">New Task Assigned</p>
                    <p className="text-sm text-primary-700 mt-0.5">
                      You have been assigned {(TASK_TYPES.find(t => t.value === form.type)?.label || '').toLowerCase()}
                      {form.shipment ? ` for ${shipments.find(s => s._id === form.shipment)?.containerNumber || ''}` : ''}.
                    </p>
                  </div>
                )}
              </div>

              {formError && (
                <div className="px-6 pb-2">
                  <p className="text-sm text-red-600">{formError}</p>
                </div>
              )}

              <div className="px-6 py-4 border-t border-gray-100 flex justify-end space-x-3">
                <button onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="btn-primary flex items-center space-x-2"
                >
                  {submitting ? (
                    <><Loader className="w-4 h-4 animate-spin" /><span>Assigning...</span></>
                  ) : (
                    <><Plus className="w-4 h-4" /><span>Assign Task</span></>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Task list */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">All Tasks</h2>
              <span className="text-xs text-gray-400">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
            </div>

            {tasksLoading ? (
              <div className="p-8 text-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full mx-auto" />
              </div>
            ) : tasks.length === 0 ? (
              <div className="p-12 text-center">
                <ClipboardList className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400">No tasks yet — assign one above</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {['Task', 'Assigned To', 'Shipment', 'Priority', 'Due', 'Status', ''].map(h => (
                        <th key={h} className={`py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === '' ? 'text-right' : 'text-left'}`}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {tasks.map(task => {
                      const status = STATUS_CONFIG[task.status] || STATUS_CONFIG.pending
                      const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.medium
                      return (
                        <tr key={task._id} className="hover:bg-gray-50 transition">
                          <td className="py-3.5 px-4">
                            <p className="font-semibold text-gray-900 text-sm">{task.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {TASK_TYPES.find(t => t.value === task.type)?.label || task.type}
                            </p>
                          </td>
                          <td className="py-3.5 px-4">
                            {task.assignedTo ? (
                              <div className="flex items-center space-x-2">
                                <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center">
                                  <User className="w-3.5 h-3.5 text-primary-600" />
                                </div>
                                <span className="text-sm text-gray-700">{task.assignedTo.name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400 italic">Unassigned</span>
                            )}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="text-sm text-gray-600 font-mono">
                              {task.shipment?.containerNumber || '—'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge cfg={priority} />
                          </td>
                          <td className="py-3.5 px-4 text-sm text-gray-500">
                            {task.dueDate ? format(new Date(task.dueDate), 'MMM d') : '—'}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge cfg={status} />
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {task.status === 'pending' && (
                              <button
                                onClick={() => handleStatusChange(task._id, 'in_progress')}
                                className="text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition mr-1"
                              >
                                Start
                              </button>
                            )}
                            {task.status === 'in_progress' && (
                              <button
                                onClick={() => handleStatusChange(task._id, 'completed')}
                                className="text-xs font-semibold text-green-600 hover:text-green-800 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-lg transition"
                              >
                                Complete
                              </button>
                            )}
                            {task.status === 'completed' && (
                              <span className="text-xs text-gray-400 italic">Done</span>
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
      )}
    </div>
  )
}

export default TeamManagement
