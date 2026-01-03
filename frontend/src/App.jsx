import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import PendingApproval from './pages/PendingApproval';
import AdminDashboard from './pages/admin/Dashboard';
import OrganizerDashboard from './pages/organizer/Dashboard';
import DonorDashboard from './pages/donor/Dashboard';
import BeneficiaryDashboard from './pages/beneficiary/Dashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/pending-approval" element={<PendingApproval />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/organizer/dashboard" element={<OrganizerDashboard />} />
        <Route path="/donor/dashboard" element={<DonorDashboard />} />
        <Route path="/beneficiary/dashboard" element={<BeneficiaryDashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
