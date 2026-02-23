import { useEffect, useState } from 'react'
import { Bell, Check, Trash2, Package, FileText, MessageSquare, AlertCircle } from 'lucide-react'
import { notificationsApi } from '../services/api'
import { formatDistanceToNow } from 'date-fns'

interface Notification {
  _id: string
  type: string
  title: string
  message: string
  isRead: boolean
  createdAt: string
  shipment?: { containerNumber: string }
}

const Notifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  useEffect(() => {
    fetchNotifications()
  }, [filter])

  const fetchNotifications = async () => {
    try {
      setIsLoading(true)
      const params = filter === 'unread' ? { unreadOnly: true } : {}
      const response = await notificationsApi.getAll(params)
      setNotifications(response.data.data.notifications)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      await notificationsApi.markAsRead(id)
      setNotifications(prev => 
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      )
    } catch (error) {
      console.error('Failed to mark as read:', error)
    }
  }

  const markAllAsRead = async () => {
    try {
      await notificationsApi.markAllAsRead()
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    } catch (error) {
      console.error('Failed to mark all as read:', error)
    }
  }

  const deleteNotification = async (id: string) => {
    try {
      await notificationsApi.delete(id)
      setNotifications(prev => prev.filter(n => n._id !== id))
    } catch (error) {
      console.error('Failed to delete notification:', error)
    }
  }

  const getNotificationIcon = (type: string) => {
    const icons: Record<string, any> = {
      shipment_created: Package,
      status_changed: Package,
      document_required: FileText,
      document_verified: Check,
      document_rejected: AlertCircle,
      payment_required: AlertCircle,
      payment_received: Check,
      message_received: MessageSquare,
      task_assigned: Bell,
      task_completed: Check,
    }
    return icons[type] || Bell
  }

  const getNotificationColor = (type: string) => {
    const colors: Record<string, string> = {
      shipment_created: 'bg-blue-100 text-blue-600',
      status_changed: 'bg-blue-100 text-blue-600',
      document_required: 'bg-yellow-100 text-yellow-600',
      document_verified: 'bg-green-100 text-green-600',
      document_rejected: 'bg-red-100 text-red-600',
      payment_required: 'bg-red-100 text-red-600',
      payment_received: 'bg-green-100 text-green-600',
      message_received: 'bg-purple-100 text-purple-600',
      task_assigned: 'bg-blue-100 text-blue-600',
      task_completed: 'bg-green-100 text-green-600',
    }
    return colors[type] || 'bg-gray-100 text-gray-600'
  }

  const unreadCount = notifications.filter(n => !n.isRead).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500">
            You have {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as 'all' | 'unread')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Notifications</option>
            <option value="unread">Unread Only</option>
          </select>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-secondary flex items-center"
            >
              <Check className="w-4 h-4 mr-2" />
              Mark All Read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="card">
        <div className="card-body">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4" />
              <p className="text-gray-500">Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No notifications</h3>
              <p className="text-gray-500">You're all caught up!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => {
                const Icon = getNotificationIcon(notification.type)
                const colorClass = getNotificationColor(notification.type)
                return (
                  <div
                    key={notification._id}
                    className={`flex items-start p-4 rounded-lg transition ${
                      notification.isRead ? 'bg-white border border-gray-200' : 'bg-blue-50 border border-blue-200'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-gray-900">{notification.title}</p>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          {notification.shipment && (
                            <p className="text-sm text-primary-600 mt-1">
                              Container: {notification.shipment.containerNumber}
                            </p>
                          )}
                          <p className="text-xs text-gray-400 mt-2">
                            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2 ml-4">
                          {!notification.isRead && (
                            <button
                              onClick={() => markAsRead(notification._id)}
                              className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition"
                              title="Mark as read"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => deleteNotification(notification._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Notifications