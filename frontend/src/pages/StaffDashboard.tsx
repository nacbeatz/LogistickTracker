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
  ClipboardList,
  Clock,
  PlayCircle,
} from 'lucide-react'
import { dashboardApi, shipmentsApi, tasksApi } from '../services/api'
import { formatDistanceToNow, format, isPast } from 'date-fns'

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

interface Task {
  _id: string
  title: string
  type: string
  status: string
  priority: string
  dueDate?: string
  shipment?: { _id: string; containerNumber: string }
  createdBy?: { name: string }
}

const PRIORITY_DOT: Record<string, string> = {
  low: 'bg-gray-400', medium: 'bg-blue-500', high: 'bg-orange-500', urgent: 'bg-red-500'
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
  const [myTasks, setMyTasks] = useState<Task[]>([])
  const [taskUpdating, setTaskUpdating] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
    fetchMyTasks()
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

  const fetchMyTasks = async () => {
    try {
      const res = await tasksApi.getAll({ status: 'pending' })
      // Also fetch in_progress
      const inProgressRes = await tasksApi.getAll({ status: 'in_progress' })
      const combined = [...res.data.data.tasks, ...inProgressRes.data.data.tasks]
      setMyTasks(combined)
    } catch {
      // silent
    }
  }

  const handleTaskAction = async (taskId: string, newStatus: 'in_progress' | 'completed') => {
    setTaskUpdating(taskId)
    try {
      await tasksApi.updateStatus(taskId, newStatus)
      if (newStatus === 'completed') {
        setMyTasks(prev => prev.filter(t => t._id !== taskId))
      } else {
        setMyTasks(prev => prev.map(t => t._id === taskId ? { ...t, status: newStatus } : t))
      }
    } catch {
      // silent
    } finally {
      setTaskUpdating(null)
    }
  }

  const activeTasks = myTasks.filter(t => t.status !== 'completed')

  const statCards = [
    { label: 'Total Shipments', value: stats?.shipments.total     ?? 0, icon: Package,       accent: false },
    { label: 'On Sea',          value: stats?.shipments.onSea     ?? 0, icon: Ship,          accent: false },
    { label: 'Pending Docs',    value: stats?.documents.pending   ?? 0, icon: FileText,      accent: true  },
    { label: 'My Tasks',        value: activeTasks.length,              icon: ClipboardList, accent: activeTasks.length > 0 },
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

      {/* My Tasks */}
      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <ClipboardList className="w-4 h-4 text-primary-500" />
            <div>
              <h2 className="text-sm font-bold text-gray-900">My Tasks</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                {activeTasks.length === 0 ? 'All caught up!' : `${activeTasks.length} task${activeTasks.length !== 1 ? 's' : ''} need attention`}
              </p>
            </div>
          </div>
          {activeTasks.length > 0 && (
            <span className="w-6 h-6 rounded-full bg-accent-500 text-white text-xs font-bold flex items-center justify-center">
              {activeTasks.length}
            </span>
          )}
        </div>

        <div className="divide-y divide-gray-50">
          {activeTasks.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <CheckCircle className="w-8 h-8 text-primary-200 mb-2" />
              <p className="text-gray-400 text-sm">No pending tasks assigned to you</p>
            </div>
          ) : (
            activeTasks.map(task => {
              const isOverdue = task.dueDate && isPast(new Date(task.dueDate))
              const isUpdating = taskUpdating === task._id
              return (
                <div key={task._id} className="flex items-start justify-between px-6 py-4 hover:bg-gray-50 transition">
                  <div className="flex items-start space-x-3 min-w-0">
                    <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${PRIORITY_DOT[task.priority] || 'bg-gray-400'}`} />
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">{task.title}</p>
                      <div className="flex items-center space-x-2 mt-0.5 flex-wrap gap-y-0.5">
                        {task.shipment && (
                          <Link
                            to={`/shipments/${task.shipment._id}`}
                            className="text-xs text-primary-600 hover:underline font-mono"
                          >
                            {task.shipment.containerNumber}
                          </Link>
                        )}
                        {task.dueDate && (
                          <span className={`text-xs flex items-center space-x-0.5 ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
                            <Clock className="w-3 h-3" />
                            <span>{isOverdue ? 'Overdue · ' : ''}{format(new Date(task.dueDate), 'MMM d')}</span>
                          </span>
                        )}
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          task.status === 'in_progress'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}>
                          {task.status === 'in_progress' ? 'In Progress' : 'Pending'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4 flex-shrink-0">
                    {task.status === 'pending' && (
                      <button
                        onClick={() => handleTaskAction(task._id, 'in_progress')}
                        disabled={isUpdating}
                        title="Start task"
                        className="flex items-center space-x-1 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                      >
                        <PlayCircle className="w-3.5 h-3.5" />
                        <span>Start</span>
                      </button>
                    )}
                    <button
                      onClick={() => handleTaskAction(task._id, 'completed')}
                      disabled={isUpdating}
                      className="flex items-center space-x-1 text-xs font-semibold text-green-600 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition disabled:opacity-50"
                    >
                      {isUpdating ? (
                        <span className="w-3.5 h-3.5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-3.5 h-3.5" />
                      )}
                      <span>Complete</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
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
