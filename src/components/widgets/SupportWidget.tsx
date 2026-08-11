import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';

export default function SupportWidget(): React.JSX.Element {
  const router = useRouter();
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'paypal'>('mpesa');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const interval = setInterval(() => {
      // 1. Fade out (300ms)
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => {
        // 2. Toggle active method
        setPaymentMethod((prev) => (prev === 'mpesa' ? 'paypal' : 'mpesa'));
        // 3. Fade in (300ms)
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [fadeAnim]);

  const isMpesa = paymentMethod === 'mpesa';
  const bgColor = isMpesa ? '#00A651' : '#003087';
  const titleText = isMpesa ? 'Support via M-Pesa' : 'Support via PayPal';
  const logoText = isMpesa ? 'M-PESA' : 'PayPal';
  const descText = isMpesa 
    ? 'Quick and secure mobile money transfers.' 
    : 'Send secure international payments instantly.';

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => router.push('/profile/monetization')}
      style={styles.cardContainer}
    >
      <Animated.View style={[styles.card, { backgroundColor: bgColor, opacity: fadeAnim }]}>
        <View style={styles.header}>
          <Text style={styles.logo}>{logoText}</Text>
          <Text style={styles.heart}>❤️</Text>
        </View>
        <Text style={styles.title}>{titleText}</Text>
        <Text style={styles.description}>{descText}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  card: {
    padding: 16,
    borderRadius: 12,
    minHeight: 110,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logo: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  heart: {
    fontSize: 16,
  },
  title: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
    marginBottom: 4,
  },
  description: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 12,
    lineHeight: 16,
  },
});
