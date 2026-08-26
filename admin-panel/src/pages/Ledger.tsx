import React, { useEffect, useState } from 'react';
import {
  Download,
  DollarSign,
  Smartphone,
  CreditCard,
  Filter,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { LedgerEntry, PaymentGateway } from '../types';

type StatusFilter = 'all' | 'pending' | 'success' | 'failed' | 'expired';
type GatewayFilter = 'all' | 'daraja' | 'paypal';

export default function Ledger(): React.JSX.Element {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [gatewayFilter, setGatewayFilter] = useState<GatewayFilter>('all');

  useEffect(() => {
    fetchLedger();
  }, []);

  const fetchLedger = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('monetization_ledger')
        .select('*, profiles(full_name)')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setEntries((data ?? []) as LedgerEntry[]);
    } catch (err) {
      console.error('Failed to fetch monetization ledger:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportCSV = (): void => {
    const headers = ['Date', 'Donor', 'Gateway', 'Amount', 'Currency', 'Status', 'Reference'];
    const rows = filteredEntries.map((e) => [
      `"${new Date(e.created_at).toISOString()}"`,
      `"${(e.profiles?.full_name || 'Unknown').replace(/"/g, '""')}"`,
      `"${e.payment_gateway}"`,
      e.amount,
      `"${e.currency}"`,
      `"${e.status}"`,
      `"${e.reference_id}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const today = new Date().toISOString().slice(0, 10);

    link.setAttribute('href', url);
    link.setAttribute('download', `too-humble-ledger-${today}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDateTime = (dateStr: string): string => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getGatewayBadge = (gateway: PaymentGateway): React.JSX.Element => {
    if (gateway === 'daraja') {
      return (
        <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
          <Smartphone size={12} />
          <span>M-Pesa</span>
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 inline-flex items-center gap-1">
        <CreditCard size={12} />
        <span>PayPal</span>
      </span>
    );
  };

  const getStatusBadge = (status: string): React.JSX.Element => {
    switch (status) {
      case 'success':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
            Success
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      case 'failed':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
            Failed
          </span>
        );
      case 'cancelled':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">
            Cancelled
          </span>
        );
      case 'expired':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
            Expired
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  };

  // Filtered dataset
  const filteredEntries = entries.filter((entry) => {
    if (statusFilter !== 'all' && entry.status !== statusFilter) return false;
    if (gatewayFilter !== 'all' && entry.payment_gateway !== gatewayFilter) return false;
    return true;
  });

  // Calculate summaries from all entries
  const mpesaSuccess = entries.filter(
    (e) => e.payment_gateway === 'daraja' && e.status === 'success'
  );
  const mpesaTotalKes = mpesaSuccess.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const paypalSuccess = entries.filter(
    (e) => e.payment_gateway === 'paypal' && e.status === 'success'
  );
  const paypalTotalUsd = paypalSuccess.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Donation Ledger</h1>
          <p className="text-sm text-gray-500 mt-1">
            Real-time audit log of mobile and international donor transactions
          </p>
        </div>

        <button
          onClick={handleExportCSV}
          disabled={filteredEntries.length === 0}
          className="px-4 py-2.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-semibold shadow-sm flex items-center gap-2 transition disabled:opacity-50 self-start sm:self-auto"
        >
          <Download size={16} />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        {/* M-Pesa Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Successful M-Pesa (Daraja)
            </div>
            <div className="text-2xl font-bold text-emerald-800 mt-1">
              KES {mpesaTotalKes.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {mpesaSuccess.length} successful transactions
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <Smartphone size={24} />
          </div>
        </div>

        {/* PayPal Summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Successful PayPal
            </div>
            <div className="text-2xl font-bold text-blue-800 mt-1">
              USD ${paypalTotalUsd.toLocaleString()}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              {paypalSuccess.length} successful transactions
            </div>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <DollarSign size={24} />
          </div>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Status Filter Tabs */}
        <div className="flex items-center bg-gray-200/80 p-1 rounded-xl gap-1 overflow-x-auto">
          {(['all', 'success', 'pending', 'failed', 'expired'] as StatusFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition ${
                statusFilter === tab
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Gateway Select */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">Gateway:</span>
          <select
            value={gatewayFilter}
            onChange={(e) => setGatewayFilter(e.target.value as GatewayFilter)}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-semibold text-gray-700 outline-none focus:ring-2 focus:ring-brand-500 shadow-sm"
          >
            <option value="all">All Gateways</option>
            <option value="daraja">M-Pesa (Daraja)</option>
            <option value="paypal">PayPal</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-6 py-4">Donor</th>
                <th className="px-6 py-4">Gateway</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Reference ID</th>
                <th className="px-6 py-4">Date & Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    Loading ledger records...
                  </td>
                </tr>
              ) : filteredEntries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <Filter size={32} className="text-gray-300 mb-2" />
                      <span>No transactions found matching your filter criteria.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEntries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-gray-50 transition">
                    {/* Donor */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-semibold text-gray-900 text-xs">
                        {entry.profiles?.full_name || 'Anonymous Donor'}
                      </div>
                      {entry.phone_number ? (
                        <div className="text-[10px] text-gray-400 font-mono">
                          {entry.phone_number}
                        </div>
                      ) : null}
                    </td>

                    {/* Gateway */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getGatewayBadge(entry.payment_gateway)}
                    </td>

                    {/* Amount */}
                    <td className="px-6 py-4 whitespace-nowrap font-bold text-gray-900 text-sm">
                      {entry.amount.toLocaleString()} {entry.currency}
                    </td>

                    {/* Status */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(entry.status)}
                    </td>

                    {/* Reference ID */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className="font-mono text-xs text-gray-600 bg-gray-50 px-2 py-1 rounded border border-gray-200 select-all"
                        title={entry.reference_id}
                      >
                        {entry.reference_id.length > 20
                          ? `${entry.reference_id.slice(0, 18)}...`
                          : entry.reference_id}
                      </span>
                    </td>

                    {/* Date */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500">
                      {formatDateTime(entry.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
