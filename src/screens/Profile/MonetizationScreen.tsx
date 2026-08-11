// =============================================================================
// TOO HUMBLE - MONETIZATION SCREEN
// Buy Me a Coffee: PayPal (USD) + M-Pesa (KES) via Edge Functions
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
  createPayPalOrder,
  initiateMpesaSTKPush,
  getUserLedger,
  getPendingMpesaTransaction,
  retryMpesaSTKPush,
} from '../../services/paymentService';
import { MonetizationLedger } from '../../types/database.types';
import { useTheme, AppColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, BORDER_RADIUS, SHADOWS } from '../../constants/theme';

const PAYPAL_PRESET_USD: number[] = [1, 5, 10, 25, 50];
const MPESA_PRESET_KES: number[] = [50, 100, 250, 500, 1000];
const PAYPAL_RETURN_URL = 'toohumble://payment/paypal/success';
const PAYPAL_CANCEL_URL = 'toohumble://payment/paypal/cancel';

type GatewayTab = 'paypal' | 'mpesa';

export default function MonetizationScreen(): React.JSX.Element {
  const { user } = useAuth();
  const { colors } = useTheme();
  const styles = getStyles(colors);

  const [activeTab, setActiveTab] = useState<GatewayTab>('paypal');

  // PayPal state
  const [paypalAmount, setPaypalAmount] = useState<string>('');
  const [isPaypalProcessing, setIsPaypalProcessing] = useState<boolean>(false);
  const [showPayPalWebView, setShowPayPalWebView] = useState<boolean>(false);
  const [paypalUrl, setPaypalUrl] = useState<string>('');
  const [currentOrderId, setCurrentOrderId] = useState<string>('');

  // M-Pesa state
  const [mpesaAmount, setMpesaAmount] = useState<string>('');
  const [mpesaPhone, setMpesaPhone] = useState<string>('');
  const [isMpesaProcessing, setIsMpesaProcessing] = useState<boolean>(false);

  // Pending payment banner
  const [pendingTx, setPendingTx] = useState<MonetizationLedger | null>(null);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

  // Ledger
  const [ledger, setLedger] = useState<MonetizationLedger[]>([]);
  const [isLoadingLedger, setIsLoadingLedger] = useState<boolean>(false);

  const fetchLedger = useCallback(async (): Promise<void> => {
    if (!user) return;
    setIsLoadingLedger(true);
    try {
      const data = await getUserLedger(user.id);
      setLedger(data);
    } catch (err) {
      console.error('[MonetizationScreen]', err);
    } finally {
      setIsLoadingLedger(false);
    }
  }, [user]);

  const checkPendingTransaction = useCallback(async (): Promise<void> => {
    if (!user) return;
    const pending = await getPendingMpesaTransaction(user.id);
    setPendingTx(pending);
  }, [user]);

  useEffect(() => {
    fetchLedger();
    checkPendingTransaction();
  }, [fetchLedger, checkPendingTransaction]);

  // ----------------------------------------------------------------
  // Retry handler — re-initiates STK Push for a stuck pending transaction
  // ----------------------------------------------------------------
  const handleRetryPendingPayment = useCallback(async (): Promise<void> => {
    if (!pendingTx || !user) return;
    const phone = pendingTx.phone_number ?? mpesaPhone.trim();
    if (!phone) {
      Alert.alert('Phone Required', 'Enter your M-Pesa number to retry.');
      return;
    }

    setIsRetrying(true);
    try {
      const result = await retryMpesaSTKPush({
        userId: user.id,
        phoneNumber: phone,
        amount: Number(pendingTx.amount),
      });
      if (result.success) {
        Alert.alert(
          'Retry Sent 📱',
          `A new M-Pesa prompt has been sent to ${phone}.\n\nRef: ${result.referenceId}`,
          [{ text: 'OK', onPress: () => { void fetchLedger(); void checkPendingTransaction(); } }]
        );
      } else {
        Alert.alert('Retry Failed', result.errorMessage ?? 'STK Push failed.');
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'Retry failed.');
    } finally {
      setIsRetrying(false);
    }
  }, [pendingTx, user, mpesaPhone, fetchLedger, checkPendingTransaction]);

  // ----------------------------------------------------------------
  // PayPal flow (server-side order creation via Edge Function)
  // ----------------------------------------------------------------
  const handlePayPalPay = useCallback(async (): Promise<void> => {
    const parsed = parseFloat(paypalAmount);
    if (!parsed || parsed < 1) {
      Alert.alert('Invalid Amount', 'Minimum donation is $1 USD.');
      return;
    }
    if (!user) { Alert.alert('Not signed in'); return; }

    setIsPaypalProcessing(true);
    try {
      const { approvalUrl, orderId } = await createPayPalOrder({ userId: user.id, amount: parsed });
      setCurrentOrderId(orderId);
      setPaypalUrl(approvalUrl);
      setShowPayPalWebView(true);
    } catch (err: unknown) {
      Alert.alert('PayPal Error', err instanceof Error ? err.message : 'Failed to initiate payment.');
    } finally {
      setIsPaypalProcessing(false);
    }
  }, [paypalAmount, user]);

  const handleWebViewNav = useCallback((url: string): void => {
    if (url.startsWith(PAYPAL_RETURN_URL)) {
      setShowPayPalWebView(false);
      Alert.alert('Payment Successful! 🎉', `Thank you! Your donation of $${paypalAmount} is recorded.`);
      fetchLedger();
    } else if (url.startsWith(PAYPAL_CANCEL_URL)) {
      setShowPayPalWebView(false);
      Alert.alert('Payment Cancelled', 'Your PayPal payment was cancelled.');
    }
  }, [paypalAmount, fetchLedger]);

  // ----------------------------------------------------------------
  // M-Pesa flow (via Edge Function)
  // ----------------------------------------------------------------
  const handleMpesaPay = useCallback(async (): Promise<void> => {
    const amount = parseFloat(mpesaAmount);
    if (!amount || amount < 1) { Alert.alert('Invalid Amount', 'Minimum is KES 1.'); return; }

    const phone = mpesaPhone.trim().replace(/\s+/g, '');
    if (!/^254\d{9}$/.test(phone)) {
      Alert.alert('Invalid Phone', 'Enter your number in format 254712345678.');
      return;
    }
    if (!user) { Alert.alert('Not signed in'); return; }

    setIsMpesaProcessing(true);
    try {
      const result = await initiateMpesaSTKPush({ userId: user.id, phoneNumber: phone, amount });
      if (result.success) {
        Alert.alert(
          'STK Push Sent 📱',
          `Check your phone (${phone}) for an M-Pesa PIN prompt.\n\nReference: ${result.referenceId}`,
          [{ text: 'OK', onPress: () => setTimeout(fetchLedger, 5000) }]
        );
      } else {
        Alert.alert('M-Pesa Error', result.errorMessage ?? 'STK Push failed.');
      }
    } catch (err: unknown) {
      Alert.alert('Error', err instanceof Error ? err.message : 'M-Pesa request failed.');
    } finally {
      setIsMpesaProcessing(false);
    }
  }, [mpesaAmount, mpesaPhone, user, fetchLedger]);

  // ----------------------------------------------------------------
  // Helpers
  // ----------------------------------------------------------------
  const statusColor = (status: string): string => {
    if (status === 'success')  return colors.success;
    if (status === 'failed')   return colors.danger;
    if (status === 'cancelled') return colors.textMuted;
    if (status === 'expired')  return colors.textMuted;
    return colors.warning; // pending
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.header}>
        <Text style={styles.headerTitle}>☕ Buy Me a Coffee</Text>
        <Text style={styles.headerSub}>Your generosity keeps this ministry alive 🙏</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Pending Payment Banner */}
        {pendingTx && (
          <View style={styles.pendingBanner}>
            <View style={styles.pendingBannerLeft}>
              <Text style={styles.pendingBannerTitle}>⏳ Incomplete M-Pesa Payment</Text>
              <Text style={styles.pendingBannerSub}>
                KES {Number(pendingTx.amount).toFixed(0)} initiated —{' '}
                {pendingTx.phone_number ?? 'unknown number'}.
                {' '}Waiting for M-Pesa confirmation.
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.retryBtn, isRetrying && styles.retryBtnDisabled]}
              onPress={() => void handleRetryPendingPayment()}
              disabled={isRetrying}
              activeOpacity={0.85}
            >
              {isRetrying
                ? <ActivityIndicator color={colors.white} size="small" />
                : <Text style={styles.retryBtnText}>Retry</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Gateway tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'paypal' ? styles.tabActive : null]}
            onPress={() => setActiveTab('paypal')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, activeTab === 'paypal' ? styles.tabTextActive : null]}>
              🌐 PayPal (USD)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'mpesa' ? styles.tabActive : null]}
            onPress={() => setActiveTab('mpesa')}
            activeOpacity={0.85}
          >
            <Text style={[styles.tabText, activeTab === 'mpesa' ? styles.tabTextActive : null]}>
              📱 M-Pesa (KES)
            </Text>
          </TouchableOpacity>
        </View>

        {/* PayPal panel */}
        {activeTab === 'paypal' && (
          <View style={styles.panel}>
            <Text style={styles.label}>Select or enter amount (USD)</Text>
            <View style={styles.presetsRow}>
              {PAYPAL_PRESET_USD.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.preset, paypalAmount === String(p) ? styles.presetActive : null]}
                  onPress={() => setPaypalAmount(String(p))}
                >
                  <Text style={[styles.presetText, paypalAmount === String(p) ? styles.presetTextActive : null]}>
                    ${p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.amountInput}
              value={paypalAmount}
              onChangeText={setPaypalAmount}
              placeholder="Or type custom amount"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
            <Text style={styles.helperText}>Secure payment via PayPal. Minimum $1 USD.</Text>

            <TouchableOpacity
              style={[styles.payBtn, isPaypalProcessing ? styles.payBtnDisabled : null]}
              onPress={handlePayPalPay}
              disabled={isPaypalProcessing}
              activeOpacity={0.85}
            >
              {isPaypalProcessing
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.payBtnText}>🌐 Pay with PayPal</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* M-Pesa panel */}
        {activeTab === 'mpesa' && (
          <View style={styles.panel}>
            <Text style={styles.label}>Select or enter amount (KES)</Text>
            <View style={styles.presetsRow}>
              {MPESA_PRESET_KES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.preset, mpesaAmount === String(p) ? styles.presetActive : null]}
                  onPress={() => setMpesaAmount(String(p))}
                >
                  <Text style={[styles.presetText, mpesaAmount === String(p) ? styles.presetTextActive : null]}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.amountInput}
              value={mpesaAmount}
              onChangeText={setMpesaAmount}
              placeholder="Or type custom amount (KES)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
            />
            <Text style={styles.label} numberOfLines={1}>M-Pesa Phone Number</Text>
            <TextInput
              style={styles.amountInput}
              value={mpesaPhone}
              onChangeText={setMpesaPhone}
              placeholder="254712345678"
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              maxLength={12}
            />
            <Text style={styles.helperText}>Minimum KES 1. You'll receive an STK Push on your phone.</Text>

            <TouchableOpacity
              style={[styles.payBtn, styles.payBtnMpesa, isMpesaProcessing ? styles.payBtnDisabled : null]}
              onPress={handleMpesaPay}
              disabled={isMpesaProcessing}
              activeOpacity={0.85}
            >
              {isMpesaProcessing
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.payBtnText}>📱 Pay with M-Pesa 🇰🇪</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* Transaction history */}
        <Text style={styles.sectionTitle}>Transaction History</Text>
        {isLoadingLedger ? (
          <ActivityIndicator color={colors.primary} style={{ marginVertical: SPACING.xl }} />
        ) : ledger.length === 0 ? (
          <Text style={styles.emptyText}>No transactions yet. Your giving history will appear here.</Text>
        ) : (
          ledger.map((tx) => (
            <View key={tx.id} style={styles.txRow}>
              <View style={styles.txLeft}>
                <Text style={styles.txLabel}>
                  {tx.payment_gateway === 'paypal' ? '🌐 PayPal' : '📱 M-Pesa'}
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
            renderLoading={() => <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.primary} />}
          />
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: AppColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.backgroundPrimary },
    header: { paddingTop: 52, paddingBottom: SPACING.xl, paddingHorizontal: SPACING.base },
    headerTitle: { fontSize: TYPOGRAPHY.fontSize['2xl'], fontWeight: '800', color: colors.white },
    headerSub: { fontSize: TYPOGRAPHY.fontSize.sm, color: colors.accentLight, marginTop: 4 },
    content: { padding: SPACING.base, paddingBottom: SPACING['5xl'] },
    tabRow: { flexDirection: 'row', marginBottom: SPACING.base, gap: SPACING.sm },
    tab: {
      flex: 1, paddingVertical: SPACING.md, borderRadius: BORDER_RADIUS.md, alignItems: 'center',
      backgroundColor: colors.backgroundCard, borderWidth: 1.5, borderColor: colors.border, ...SHADOWS.sm,
    },
    tabActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    tabText: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700', color: colors.textSecondary },
    tabTextActive: { color: colors.white },
    panel: {
      backgroundColor: colors.backgroundCard, borderRadius: BORDER_RADIUS.xl, padding: SPACING.base,
      marginBottom: SPACING['2xl'], ...SHADOWS.md,
    },
    label: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '600', color: colors.textSecondary, marginBottom: SPACING.sm },
    presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm, marginBottom: SPACING.md },
    preset: {
      paddingHorizontal: SPACING.base, paddingVertical: SPACING.sm,
      borderRadius: BORDER_RADIUS.full, borderWidth: 1.5, borderColor: colors.border,
      backgroundColor: colors.backgroundCard,
    },
    presetActive: { backgroundColor: colors.primary, borderColor: colors.primary },
    presetText: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700', color: colors.textSecondary },
    presetTextActive: { color: colors.white },
    amountInput: {
      backgroundColor: colors.backgroundPrimary, borderWidth: 1.5, borderColor: colors.border,
      borderRadius: BORDER_RADIUS.md, padding: SPACING.base, fontSize: TYPOGRAPHY.fontSize.base,
      color: colors.textPrimary, marginBottom: SPACING.sm, ...SHADOWS.sm,
    },
    helperText: { fontSize: TYPOGRAPHY.fontSize.xs, color: colors.textMuted, marginBottom: SPACING.md },
    payBtn: {
      backgroundColor: colors.primary, borderRadius: BORDER_RADIUS.md, height: 56,
      alignItems: 'center', justifyContent: 'center', ...SHADOWS.md,
    },
    payBtnMpesa: { backgroundColor: '#007A3D' }, // Safaricom green
    payBtnDisabled: { opacity: 0.6 },
    payBtnText: { color: colors.white, fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700' },
    sectionTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700', color: colors.textPrimary, marginBottom: SPACING.md },
    txRow: {
      flexDirection: 'row', backgroundColor: colors.backgroundCard, borderRadius: BORDER_RADIUS.lg,
      padding: SPACING.md, marginBottom: SPACING.sm, alignItems: 'center', ...SHADOWS.sm,
    },
    txLeft: { flex: 1 },
    txLabel: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700', color: colors.textPrimary },
    txRef: { fontSize: TYPOGRAPHY.fontSize.xs, color: colors.textMuted, marginTop: 2 },
    txDate: { fontSize: TYPOGRAPHY.fontSize.xs, color: colors.textMuted, marginTop: 2 },
    txRight: { alignItems: 'flex-end' },
    txAmount: { fontSize: TYPOGRAPHY.fontSize.base, fontWeight: '700', color: colors.textPrimary },
    txStatus: { fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: '700', marginTop: 2 },
    emptyText: { color: colors.textMuted, textAlign: 'center', paddingVertical: SPACING.xl },
    webViewContainer: { flex: 1, backgroundColor: colors.backgroundPrimary },
    webViewHeader: {
      flexDirection: 'row', alignItems: 'center', paddingTop: 52, paddingHorizontal: SPACING.base,
      paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: colors.border,
    },
    webViewClose: { color: colors.danger, fontWeight: '600', fontSize: TYPOGRAPHY.fontSize.base, marginRight: SPACING.xl },
    webViewTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: '700', color: colors.textPrimary },
    // Pending payment banner
    pendingBanner: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: '#7C3AED15', borderWidth: 1.5, borderColor: '#7C3AED',
      borderRadius: BORDER_RADIUS.lg, padding: SPACING.md,
      marginBottom: SPACING.base, gap: SPACING.sm,
    },
    pendingBannerLeft: { flex: 1 },
    pendingBannerTitle: {
      fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: '700',
      color: '#7C3AED', marginBottom: 2,
    },
    pendingBannerSub: { fontSize: TYPOGRAPHY.fontSize.xs, color: colors.textSecondary, lineHeight: 16 },
    retryBtn: {
      backgroundColor: '#7C3AED', borderRadius: BORDER_RADIUS.md,
      paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm, minWidth: 60, alignItems: 'center',
    },
    retryBtnDisabled: { opacity: 0.6 },
    retryBtnText: { color: colors.white, fontSize: TYPOGRAPHY.fontSize.xs, fontWeight: '700' },
  });
