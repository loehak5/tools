import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/DashboardMain';
import Accounts from './pages/Accounts';
import Scheduler from './pages/Scheduler';
import ProxySettings from './pages/ProxySettings';
import Automation from './pages/Automation';
import Monitoring from './pages/Monitoring';
import Reports from './pages/Reports';
import Login from './pages/Login';
import AdminPanel from './pages/AdminPanel';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';

function App() {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route path="/" element={
                        <ProtectedRoute>
                            <Layout />
                        </ProtectedRoute>
                    }>
                        <Route index element={<Dashboard />} />
                        <Route path="accounts" element={<Accounts />} />
                        <Route path="scheduler" element={<Scheduler />} />
                        <Route path="automation" element={<Automation />} />
                        <Route path="monitoring" element={<Monitoring />} />
                        <Route path="reports" element={<Reports />} />
                        <Route path="settings" element={<ProxySettings />} />
                        <Route path="admin" element={
                            <ProtectedRoute allowedRoles={['admin']}>
                                <AdminPanel />
                            </ProtectedRoute>
                        } />
                        <Route path="*" element={<div className="text-white p-10">Page not found</div>} />
                    </Route>
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
}

export default App;
