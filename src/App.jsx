import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import CustomerDashboard from './pages/customer/Dashboard'
import CustomerApplications from './pages/customer/Applications'
import AdminDashboard from './pages/admin/Dashboard'
import AdminApplications from './pages/admin/Applications'
import AdminUsers from './pages/admin/Users'
import ApplicationDetail from './pages/ApplicationDetail'
import NewApplication from './pages/NewApplication'
import './index.css'

function Spinner() {
  return <div className="loading"><span className="spinner spinner-lg" /></div>
}

function RootRedirect() {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  return <Navigate to="/dashboard" replace />
}

function Guard({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && !isAdmin) return <Navigate to="/dashboard" replace />
  return children
}

function PublicOnly({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />

          {/* Root redirect based on role */}
          <Route path="/" element={<RootRedirect />} />

          {/* Customer */}
          <Route path="/dashboard" element={<Guard><CustomerDashboard /></Guard>} />
          <Route path="/applications" element={<Guard><CustomerApplications /></Guard>} />
          <Route path="/applications/new" element={<Guard><NewApplication /></Guard>} />
          <Route path="/applications/:id" element={<Guard><ApplicationDetail /></Guard>} />

          {/* Admin */}
          <Route path="/admin" element={<Guard adminOnly><AdminDashboard /></Guard>} />
          <Route path="/admin/applications" element={<Guard adminOnly><AdminApplications /></Guard>} />
          <Route path="/admin/applications/:id" element={<Guard adminOnly><ApplicationDetail /></Guard>} />
          <Route path="/admin/users" element={<Guard adminOnly><AdminUsers /></Guard>} />

          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
