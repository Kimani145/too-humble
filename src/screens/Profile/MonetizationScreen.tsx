// =============================================================================
// TOO HUMBLE - MONETIZATION SCREEN
// PayPal WebView checkout + transaction history
// =============================================================================

import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
  ActivityIndicator, ScrollView, StatusBar, Modal,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import {
  getPayPalCheckoutUrl,
  persistPayPalSuccess, getUserLedger,
} from '../../services/paymentService';
import { MonetizationLedger } from '../../types/database.types';
import { COLORS, TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const PRESET_AMOUNTS: number[] = [5, 10, 25, 50, 100];
const PAYPAL_RETURN_URL = 'toohumble://payment/paypal/success';
const PAYPAL_CANCEL_URL = 'toohumble://payment/paypal/cancel';

export default function MonetizationScreen(): React.JSX.Element {
  const { user } = useAuth();
  const [amount, setAmount] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showPayPalWebView, setShowPayPalWebView] = useState<boolean>(false);
  const [paypalUrl, setPaypalUrl] = useState<string>('');
  const [ledger, setLedger] = useState<MonetizationLedger[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState<boolean>(false);

  const fetchLedger = useCallback(async (): Promise<void> => {
    if (!user) return;
    setIsLoadingLedger(true);
    try {
      const data = await getUserLedger(user.id);
      setLedger((data ?? []) as MonetizationLedger[]);
    } catch (err) {
      console.error('[MonetizationScreen]', err);
    } finally {
      setIsLoadingLedger(false);
    }
  }, [user]);

  useEffect(() => { fetchLedger(); }, [fetchLedger]);

  // ----------------------------------------------------------------
  // PayPal
  // ----------------------------------------------------------------
  const handlePayPalPay = useCallback((): void => {
    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount < 1) { Alert.alert('Invalid Amount', 'Enter a valid amount (minimum $1).'); return; }
    setIsProcessing(true);
    const url = getPayPalCheckoutUrl({
      amount: parsedAmount, currency: 'USD',
      description: 'Too Humble Donation',
      returnUrl: PAYPAL_RETURN_URL, cancelUrl: PAYPAL_CANCEL_URL,
    });
    setPaypalUrl(url);
    setShowPayPalWebView(true);
    setIsProcessing(false);
  }, [amount]);

  const handleWebViewNav = useCallback((url: string): void => {
    if (url.startsWith(PAYPAL_RETURN_URL)) {
      setShowPayPalWebView(false);
      const urlParams = new URLSearchParams(url.split('?')[1] ?? '');
      const orderId = urlParams.get('token') ?? `PP-${Date.now()}`;
      if (user) {
        persistPayPalSuccess({ userId: user.id, orderId, amount: parseFloat(amount), currency: 'USD' })
          .then(() => { Alert.alert('Payment Successful! 🎉', 'Thank you for your support.'); fetchLedger(); })
          .catch(console.error);
      }
    } else if (url.startsWith(PAYPAL_CANCEL_URL)) {
      setShowPayPalWebView(false);
      Alert.alert('Payment Cancelled', 'Your PayPal payment was cancelled.');
    }
  }, [user, amount, fetchLedger]);

  // ----------------------------------------------------------------
  // Render
  // ----------------------------------------------------------------
  const statusColor = (status: string): string => {
    if (status === 'success') return COLORS.success;
    if (status === 'failed') return COLORS.error;
    if (status === 'cancelled') return COLORS.midGray;
    return COLORS.warning;
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.primary} />
      <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={styles.header}>
        <Text style={styles.headerTitle}>Support Too Humble</Text>
        <Text style={styles.headerSub}>Support with PayPal — secure global giving 🌐 🙏</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Amount presets */}
        <Text style={styles.label}>Select or enter amount (USD)</Text>
        <View style={styles.presetsRow}>
          {PRESET_AMOUNTS.map((preset) => (
            <TouchableOpacity
              key={preset} style={[styles.preset, amount === String(preset) ? styles.presetActive : null]}
              onPress={() => setAmount(String(preset))}
            >
              <Text style={[styles.presetText, amount === String(preset) ? styles.presetTextActive : null]}>
                ${preset}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <TextInput
          style={styles.amountInput} value={amount} onChangeText={setAmount}
          placeholder="Or type custom amount" placeholderTextColor={COLORS.midGray}
          keyboardType="numeric"
        />
        <Text style={styles.helperText}>Amounts in USD. Minimum $1.</Text>

        {/* CTA */}
        <TouchableOpacity
          style={[styles.payBtn, isProcessing ? styles.payBtnDisabled : null]}
          onPress={handlePayPalPay}
          disabled={isProcessing}
        >
          {isProcessing
            ? <ActivityIndicator color={COLORS.white} />
            : <Text style={styles.payBtnText}>🌐 Pay with PayPal</Text>
          }
        </TouchableOpacity>

        {/* Transaction history */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {isLoadingLedger ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: SPACING.xl }} />
        ) : ledger.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet.</Text>
        ) : (
          ledger.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txLabel}>
                  {tx.payment_gateway === 'paypal' ? '🌐 PayPal' : '📱 Mobile'}
                </Text>
                <Text style={styles.txRef} numberOfLines={1}>{tx.reference_id}</Text>
                <Text style={styles.txDate}>{new Date(tx.created_at).toLocaleDateString()}</Text>
              </View>
              <View style={styles.txRight}>
                <Text style={styles.txAmount}>{tx.currency} {Number(tx.amount).toFixed(2)}</Text>
                <Text style={[styles.txStatus, { color: statusColor(tx.status) }]}>
                  {tx.status.toUpperCase()}
                </Text>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* PayPal WebView Modal */}
      <Modal visible={showPayPalWebView} animationType="slide" onRequestClose={() => setShowPayPalWebView(false)}>
        <View style={styles.webViewContainer}>
          <View style={styles.webViewHeader}>
            <TouchableOpacity onPress={() => setShowPayPalWebView(false)}>
              <Text style={styles.webViewClose}>✕ Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.webViewTitle}>PayPal Checkout</Text>
          </View>
          <WebView
            source={{ uri: paypalUrl }}
            onNavigationStateChange={(state) => handleWebViewNav(state.url)}
            startInLoadingState
            renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} color={COLORS.primary} />}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.backgroundPrimary },
  header: { paddingTop: 52, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.base },
  headerTitle: { fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: '800', color: COLORS.white },
  headerSub: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.accentLight, marginTop: 4 },
  content: { padding: SPACING.base, paddingBottom: SPACING['5xl'] },
  label: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '600', color: COLORS.darkGray, marginBottom: SPACING.sm },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
  preset: {
    paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full, borderWidth: 1.5, borderColor: COLORS.lightGray, backgroundColor: COLORS.white,
  },
  presetActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  presetText: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700', color: COLORS.darkGray },
  presetTextActive: { color: COLORS.white },
  amountInput: {
    backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.lightGray,
    borderRadius: BORDER_RADIUS.md, padding: SPACING.base, fontSize: TYPOGRAPHY.fontSize.base,
    color: COLORS.charcoal, ...SHADOWS.sm,
  },
  helperText: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginBottom: SPACING.md, marginTop: SPACING.xs },
  payBtn: {
    backgroundColor: COLORS.primary, borderRadius: BORDER_RADIUS.md, height: 56,
    alignItems: 'center', justifyContent: 'center', marginBottom: SPACING['2xl'], ...SHADOWS.md,
  },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: COLORS.white, fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700' },
  sectionTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700', color: COLORS.charcoal, marginBottom: SPACING.md },
  txRow: {
    flexDirection: 'row', backgroundColor: COLORS.white, borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md, marginBottom: SPACING.sm, alignItems: 'center', ...SHADOWS.sm,
  },
  txLeft: { flex: 1 },
  txLabel: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700', color: COLORS.charcoal },
  txRef: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginTop: 2 },
  txDate: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.midGray, marginTop: 2 },
  txRight: { alignItems: 'flex-end' },
  txAmount: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '700', color: COLORS.charcoal },
  txStatus: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: '700', marginTop: 2 },
  emptyText: { color: COLORS.midGray, textAlign: 'center', paddingVertical: SPACING.xl },
  webViewContainer: { flex: 1, backgroundColor: COLORS.white },
  webViewHeader: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: SPACING.base,
    paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.lightGray,
  },
  webViewClose: { color: COLORS.error, fontWeight: '600', fontSize: TYPOGRAPHY.fontSize.base, marginRight: SPACING.xl },
  webViewTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700', color: COLORS.charcoal },
});
