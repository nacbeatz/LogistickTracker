import axios from 'axios'
import { useAuthStore } from '../store/authStore'

const API_URL = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// Auth API
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  
  register: (data: {
    email: string
    password: string
    name: string
    company?: string
    phone?: string
  }) => api.post('/auth/register', data),
  
  getMe: () => api.get('/auth/me'),
  
  updateProfile: (data: Partial<User>) =>
    api.put('/auth/profile', data),
  
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  
  logout: () => api.post('/auth/logout'),
}

// Shipments API
export const shipmentsApi = {
  getAll: (params?: {
    status?: string
    search?: string
    page?: number
    limit?: number
  }) => api.get('/shipments', { params }),
  
  getStats: () => api.get('/shipments/stats/overview'),
  
  getById: (id: string) => api.get(`/shipments/${id}`),
  
  create: (data: CreateShipmentData) => api.post('/shipments', data),
  
  update: (id: string, data: Partial<CreateShipmentData>) =>
    api.put(`/shipments/${id}`, data),
  
  updateStatus: (id: string, status: string, notes?: string) =>
    api.put(`/shipments/${id}/status`, { status, notes }),
  
  delete: (id: string) => api.delete(`/shipments/${id}`),
}

// Documents API
export const documentsApi = {
  getAll: (params?: {
    shipment?: string
    type?: string
    status?: string
  }) => api.get('/documents', { params }),
  
  getById: (id: string) => api.get(`/documents/${id}`),
  
  upload: (formData: FormData) =>
    api.post('/documents/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  
  verify: (id: string, status: 'verified' | 'rejected', rejectionReason?: string) =>
    api.put(`/documents/${id}/verify`, { status, rejectionReason }),
  
  download: (id: string) =>
    api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  
  getRequired: (shipmentId: string) =>
    api.get(`/documents/required/${shipmentId}`),
  
  delete: (id: string) => api.delete(`/documents/${id}`),
}

// Notifications API
export const notificationsApi = {
  getAll: (params?: { unreadOnly?: boolean }) =>
    api.get('/notifications', { params }),
  
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  
  markAllAsRead: () => api.put('/notifications/read-all'),
  
  delete: (id: string) => api.delete(`/notifications/${id}`),
}

// Tasks API
export const tasksApi = {
  getAll: (params?: {
    status?: string
    assignedTo?: string
    shipment?: string
  }) => api.get('/tasks', { params }),
  
  getById: (id: string) => api.get(`/tasks/${id}`),
  
  create: (data: CreateTaskData) => api.post('/tasks', data),
  
  updateStatus: (id: string, status: string, notes?: string) =>
    api.put(`/tasks/${id}/status`, { status, notes }),
  
  update: (id: string, data: Partial<CreateTaskData>) =>
    api.put(`/tasks/${id}`, data),
  
  delete: (id: string) => api.delete(`/tasks/${id}`),
}

// Dashboard API
export const dashboardApi = {
  getOverview: () => api.get('/dashboard/overview'),
  
  getInvoiceCollection: () => api.get('/dashboard/invoice-collection'),
  
  getPerformance: (period?: string) =>
    api.get('/dashboard/performance', { params: { period } }),
  
  getClientDashboard: () => api.get('/dashboard/client'),
}

// Invoices API
export const invoicesApi = {
  getAll: (params?: { shipment?: string; client?: string; status?: string; page?: number }) =>
    api.get('/invoices', { params }),

  getById: (id: string) => api.get(`/invoices/${id}`),

  create: (data: CreateInvoiceData) => api.post('/invoices', data),

  pay: (id: string, data: { paidAmount: number; paymentMethod: string; paymentReference?: string }) =>
    api.put(`/invoices/${id}/pay`, data),

  update: (id: string, data: any) => api.put(`/invoices/${id}`, data),

  delete: (id: string) => api.delete(`/invoices/${id}`),
}

// Ratings API
export const ratingsApi = {
  getAll: (params?: { shipment?: string; page?: number }) =>
    api.get('/ratings', { params }),

  getForShipment: (shipmentId: string) =>
    api.get(`/ratings/shipment/${shipmentId}`),

  create: (data: { shipment: string; rating: number; comment?: string; category?: string }) =>
    api.post('/ratings', data),

  respond: (id: string, text: string) =>
    api.put(`/ratings/${id}/respond`, { text }),
}

// Messages API
export const messagesApi = {
  getForShipment: (shipmentId: string, page?: number) =>
    api.get(`/messages/${shipmentId}`, { params: { page } }),

  send: (data: { shipment: string; content: string; type?: string; replyTo?: string }) =>
    api.post('/messages', data),

  delete: (id: string) => api.delete(`/messages/${id}`),

  getUnreadCount: () => api.get('/messages/unread/count'),
}

// Users API
export const usersApi = {
  getAll: (params?: { role?: string; search?: string }) =>
    api.get('/users', { params }),
  
  getClients: (search?: string) =>
    api.get('/users/clients', { params: { search } }),
  
  getById: (id: string) => api.get(`/users/${id}`),
  
  create: (data: CreateUserData) => api.post('/users', data),
  
  update: (id: string, data: Partial<CreateUserData>) =>
    api.put(`/users/${id}`, data),
  
  delete: (id: string) => api.delete(`/users/${id}`),
}

// Types
interface User {
  _id: string
  email: string
  name: string
  role: string
  company?: string
  phone?: string
}

interface CreateShipmentData {
  containerNumber: string
  blNumber?: string
  shippingLine: string
  vesselName?: string
  etd: string
  eta: string
  origin: string
  destination: string
  shipmentType?: string
  containerType?: string
  weight?: number
  cargoDescription?: string
  clients?: string[]
  notes?: string
}

interface CreateTaskData {
  shipment: string
  type: string
  title: string
  description?: string
  assignedTo?: string
  dueDate?: string
  priority?: string
  notes?: string
}

interface CreateUserData {
  email: string
  password: string
  name: string
  role: string
  company?: string
  phone?: string
  language?: string
}

interface CreateInvoiceData {
  shipment: string
  client: string
  type: string
  items: Array<{ description: string; quantity: number; unitPrice: number }>
  tax?: number
  currency?: string
  dueDate: string
  notes?: string
}

export default api
