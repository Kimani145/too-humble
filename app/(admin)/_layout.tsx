import React from 'react';
import { Stack } from 'expo-router';
import { Redirect } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import LoadingScreen from '../../src/screens/Auth/LoadingScreen';

export default function AdminLayout(): React.JSX.Element {
  const { isAuthenticated, role, isLoading } = useAuth();
  if (isLoading) return <LoadingScreen />;
  if (!isAuthenticated || role !== 'admin') {
    return <Redirect href="/auth/login" />;
  }
  return <Stack screenOptions={{ headerShown: false }} />;
}
