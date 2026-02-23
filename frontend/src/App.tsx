import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Shipments from './pages/Shipments'
import ShipmentDetail from './pages/ShipmentDetail'
import Documents from './pages/Documents'
import Notifications from './pages/Notifications'
import Profile from './pages/Profile'
import StaffDashboard from './pages/StaffDashboard'
import ManagerDashboard from './pages/ManagerDashboard'
import NewShipment from './pages/NewShipment'
import Invoices from './pages/Invoices'

// Protected Route component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) => {
  const { user, isAuthenticated } = useAuthStore()
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  
  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <Layout />
        </ProtectedRoute>
      }>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="shipments" element={<Shipments />} />
        <Route path="shipments/:id" element={<ShipmentDetail />} />
        <Route path="documents" element={<Documents />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="profile" element={<Profile />} />
        
        {/* Staff Routes */}
        <Route path="staff" element={
          <ProtectedRoute allowedRoles={['staff', 'manager', 'admin']}>
            <StaffDashboard />
          </ProtectedRoute>
        } />
        
        <Route path="shipments/new" element={
          <ProtectedRoute allowedRoles={['staff', 'manager', 'admin']}>
            <NewShipment />
          </ProtectedRoute>
        } />
        
        {/* Manager Routes */}
        <Route path="manager" element={
          <ProtectedRoute allowedRoles={['manager', 'admin']}>
            <ManagerDashboard />
          </ProtectedRoute>
        } />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
