import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Intro from './components/Intro'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Agent from './pages/Agent'
import Policies from './pages/Policies'
import PaymentRequests from './pages/PaymentRequests'
import Approvals from './pages/Approvals'
import Risk from './pages/Risk'
import Payments from './pages/Payments'
import PaymentResult from './pages/PaymentResult'
import Audit from './pages/Audit'
import Settings from './pages/Settings'

function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/agent" element={<Agent />} />
        <Route path="/policies" element={<Policies />} />
        <Route path="/payment-requests" element={<PaymentRequests />} />
        <Route path="/approvals" element={<Approvals />} />
        <Route path="/risk" element={<Risk />} />
        <Route path="/payments" element={<Payments />} />
        {/* PayPal redirects the buyer back to these routes (see PAYPAL_RETURN_URL
            / PAYPAL_CANCEL_URL). They confirm the real result with the backend. */}
        <Route path="/payment/return" element={<PaymentResult mode="return" />} />
        <Route path="/payment/cancel" element={<PaymentResult mode="cancel" />} />
        <Route path="/audit" element={<Audit />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Intro />
    </>
  )
}

export default App
