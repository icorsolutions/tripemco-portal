import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import CustomerDashboard from './pages/customer/Dashboard'
import AdminDashboard from './pages/admin/Dashboard'
import './index.css'

function Spinner() {
  return (
    <div className="loading">
      <span className="spinner spinner-lg" />
    </div>
  )
}

function RootRedirect() {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (isAdmin) return <Navigate to="/admin" replace />
  return <Navigate to="/dashboard" replace />
}

function ProtectedCustomer({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function ProtectedAdmin({ children }) {
  const { user, loading, isAdmin } = useAuth()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
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
          <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
          <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
          <Route path="/" element={<RootRedirect />} />
          <Route path="/dashboard" element={<ProtectedCustomer><CustomerDashboard /></ProtectedCustomer>} />
          <Route path="/admin" element={<ProtectedAdmin><AdminDashboard /></ProtectedAdmin>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
