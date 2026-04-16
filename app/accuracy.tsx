import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import {
  getCorrectionStats,
  seedDemoCorrections,
  clearCorrections,
  type CorrectionStats,
} from '@/services/accuracyLearningService';

export default function AccuracyScreen() {
  const [stats, setStats] = useState<CorrectionStats | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = async () => {
    setLoading(true);
    await seedDemoCorrections();
    const s = await getCorrectionStats();
    setStats(s);
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const handleReset = () => {
    Alert.alert(
      'Reset Accuracy Learning',
      'This will clear all correction history. Future scans will not have personalized adjustments.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await clearCorrections();
            reload();
          },
        },
      ]
    );
  };

  if (loading || !stats) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading insights...</Text>
      </SafeAreaView>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'AI Accuracy', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <FontAwesome name="line-chart" size={32} color={Colors.brand.primary} />
            </View>
            <Text style={styles.heroTitle}>Personal AI Learning</Text>
            <Text style={styles.heroSubtitle}>
              Every correction trains a personal model that improves accuracy for YOUR fridge.
            </Text>
          </View>

          {/* Score */}
          <View style={styles.scoreCard}>
            <Text style={styles.scoreValue}>{stats.accuracy_trend}%</Text>
            <Text style={styles.scoreLabel}>30-day accuracy</Text>
            <View style={styles.scoreBarBg}>
              <View
                style={[
                  styles.scoreBarFill,
                  {
                    width: `${stats.accuracy_trend}%`,
                    backgroundColor:
                      stats.accuracy_trend >= 90 ? Colors.brand.primary
                      : stats.accuracy_trend >= 75 ? '#FFC107' : '#F44336',
                  },
                ]}
              />
            </View>
            <Text style={styles.scoreFootnote}>
              {stats.total_corrections} total corrections logged
            </Text>
          </View>

          {/* Common misidentifications */}
          {stats.most_common_misidentifications.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Most Common Mix-ups</Text>
              <Text style={styles.sectionSubtitle}>
                The AI now knows about these and will be extra careful
              </Text>
              {stats.most_common_misidentifications.map((m, idx) => (
                <View key={idx} style={styles.mixupCard}>
                  <View style={styles.mixupRow}>
                    <View style={styles.aiBadge}>
                      <FontAwesome name="eye" size={11} color="#999" />
                      <Text style={styles.aiBadgeText}>AI sees</Text>
                    </View>
                    <Text style={styles.mixupName}>{m.ai_said}</Text>
                  </View>
                  <FontAwesome name="long-arrow-right" size={14} color="#CCC" style={styles.arrow} />
                  <View style={styles.mixupRow}>
                    <View style={[styles.aiBadge, { backgroundColor: '#E8F5E9' }]}>
                      <FontAwesome name="user" size={11} color={Colors.brand.primary} />
                      <Text style={[styles.aiBadgeText, { color: Colors.brand.primary }]}>You said</Text>
                    </View>
                    <Text style={styles.mixupName}>{m.user_says}</Text>
                  </View>
                  <View style={styles.mixupCount}>
                    <Text style={styles.mixupCountText}>x{m.count}</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* User-specific items */}
          {stats.user_specific_items.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Frequent Items</Text>
              <Text style={styles.sectionSubtitle}>
                Now part of your personalized prompt - the AI will look for these specifically
              </Text>
              <View style={styles.itemChips}>
                {stats.user_specific_items.map((item) => (
                  <View key={item} style={styles.itemChip}>
                    <FontAwesome name="bookmark" size={10} color={Colors.brand.primary} />
                    <Text style={styles.itemChipText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* How it works */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            {[
              { icon: 'camera', step: '1', text: 'You scan your fridge' },
              { icon: 'edit', step: '2', text: 'You correct any wrong identifications' },
              { icon: 'database', step: '3', text: 'Corrections are saved locally on your device' },
              { icon: 'magic', step: '4', text: 'Next scan includes your personalized hints' },
              { icon: 'rocket', step: '5', text: 'Accuracy improves the more you use it' },
            ].map((s) => (
              <View key={s.step} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{s.step}</Text>
                </View>
                <FontAwesome name={s.icon as any} size={14} color={Colors.brand.primary} />
                <Text style={styles.stepText}>{s.text}</Text>
              </View>
            ))}
          </View>

          {/* Privacy */}
          <View style={styles.privacyCard}>
            <FontAwesome name="lock" size={14} color="#666" />
            <Text style={styles.privacyText}>
              Corrections are stored locally on your device. We never see your specific items.
            </Text>
          </View>

          {/* Reset */}
          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetText}>Reset Learning Data</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingText: { textAlign: 'center', marginTop: 60, color: '#999' },
  scrollContent: { padding: 16 },
  hero: { alignItems: 'center', paddingVertical: 16, marginBottom: 12 },
  heroIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  heroSubtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 300 },
  scoreCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, alignItems: 'center', marginBottom: 12 },
  scoreValue: { fontSize: 48, fontWeight: '800', color: Colors.brand.primary },
  scoreLabel: { fontSize: 13, color: '#999', fontWeight: '600' },
  scoreBarBg: { width: '100%', height: 6, backgroundColor: '#F0F0F0', borderRadius: 3, marginTop: 12 },
  scoreBarFill: { height: 6, borderRadius: 3 },
  scoreFootnote: { fontSize: 11, color: '#999', marginTop: 8 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  sectionSubtitle: { fontSize: 11, color: '#999', marginTop: 2, marginBottom: 10 },
  mixupCard: { backgroundColor: '#FAFAFA', borderRadius: 10, padding: 12, marginBottom: 8, position: 'relative' },
  mixupRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F0F0F0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  aiBadgeText: { fontSize: 10, color: '#999', fontWeight: '600' },
  mixupName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  arrow: { marginLeft: 12 },
  mixupCount: { position: 'absolute', top: 12, right: 12, backgroundColor: '#FFF3E0', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  mixupCountText: { fontSize: 11, fontWeight: '700', color: '#FF6D00' },
  itemChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  itemChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E8F5E9', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  itemChipText: { fontSize: 12, color: Colors.brand.primary, fontWeight: '600' },
  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  stepNumber: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 13, color: '#333' },
  privacyCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, marginBottom: 12 },
  privacyText: { flex: 1, fontSize: 11, color: '#666', lineHeight: 16 },
  resetButton: { padding: 14, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#FFEBEE' },
  resetText: { fontSize: 13, color: '#D32F2F', fontWeight: '600' },
});
