import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { FadeInView } from './Animated';

// Shows when running in demo mode (no Supabase backend) so users understand the data is fake.
export function DemoBanner() {
  const [dismissed, setDismissed] = useState(false);

  const isDemoMode =
    !process.env.EXPO_PUBLIC_SUPABASE_URL ||
    process.env.EXPO_PUBLIC_SUPABASE_URL.includes('your-project');

  if (!isDemoMode || dismissed) return null;

  return (
    <FadeInView delay={200}>
      <View style={styles.banner}>
        <FontAwesome name="info-circle" size={14} color="#FF6D00" />
        <Text style={styles.text}>
          <Text style={styles.bold}>Demo mode</Text> - data is sample. Add Supabase + Anthropic keys to make it real.
        </Text>
        <Pressable hitSlop={8} onPress={() => setDismissed(true)}>
          <FontAwesome name="times" size={14} color="#999" />
        </Pressable>
      </View>
    </FadeInView>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  text: {
    flex: 1,
    fontSize: 12,
    color: '#5D4037',
    lineHeight: 16,
  },
  bold: {
    fontWeight: '700',
    color: '#FF6D00',
  },
});
