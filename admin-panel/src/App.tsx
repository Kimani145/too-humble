import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAdminAuth } from './hooks/useAdminAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Overview from './pages/Overview';

// Placeholder pages to be filled in PROMPT 2 and PROMPT 3:
const PlaceholderPage = ({ title }: { title: string }): React.JSX.Element => (
  <div className="text-2xl font-bold text-gray-900">{title}</div>
);

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
        <Route path="/content"    element={<PlaceholderPage title="Content" />} />
        <Route path="/moderation" element={<PlaceholderPage title="Moderation" />} />
        <Route path="/users"      element={<PlaceholderPage title="Users" />} />
        <Route path="/ledger"     element={<PlaceholderPage title="Ledger" />} />
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
