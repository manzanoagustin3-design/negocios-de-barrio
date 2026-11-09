import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import RegisterPage from './pages/RegisterPage'
import StatusCheckPage from './pages/StatusCheckPage'
import PortalPage from './pages/PortalPage'
import AdminLoginPage from './pages/AdminLoginPage'
import AdminDashboardPage from './pages/AdminDashboardPage'
import AdminDetailPage from './pages/AdminDetailPage'
import { useAdminToken } from './lib/useAdminToken'

export default function App() {
  const { token, setToken } = useAdminToken()

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RegisterPage />} />
        <Route path="/estado" element={<StatusCheckPage />} />
        <Route path="/portal/:businessId" element={<PortalPage />} />
        <Route
          path="/admin"
          element={
            token ? <AdminDashboardPage token={token} onLogout={() => setToken('')} /> : <AdminLoginPage onLogin={setToken} />
          }
        />
        <Route
          path="/admin/negocios/:id"
          element={token ? <AdminDetailPage token={token} /> : <AdminLoginPage onLogin={setToken} />}
        />
      </Routes>
    </Layout>
  )
}
