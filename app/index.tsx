// app/index.tsx — redirect entry point
import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';

export default function Index(): React.JSX.Element {
  const { isAuthenticated, role, isLoading } = useAuth();
  if (isLoading) return <></>;
  if (!isAuthenticated) return <Redirect href="/auth/login" />;
  if (role === 'admin') return <Redirect href="/(admin)/dashboard" />;
  return <Redirect href="/(tabs)/home" />;
}
