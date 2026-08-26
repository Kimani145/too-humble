import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from './hooks/useAdminAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Content from './pages/Content';
import Moderation from './pages/Moderation';
import Users from './pages/Users';
import Ledger from './pages/Ledger';

function AdminApp(): React.JSX.Element {
  const { isAdmin, isLoading } = useAdminAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-lg">Loading...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/"           element={<Overview />} />
        <Route path="/content"    element={<Content />} />
        <Route path="/moderation" element={<Moderation />} />
        <Route path="/users"      element={<Users />} />
        <Route path="/ledger"     element={<Ledger />} />
        <Route path="*"           element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/*"     element={<AdminApp />} />
      </Routes>
    </BrowserRouter>
  );
}
