import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useRouter, Stack as ExpoStack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { fetchWasteMetrics } from '@/services/wasteService';
import type { WasteMetrics } from '@/lib/types';
import { FadeInView, PressableScale, CountUp } from '@/components/Animated';

const PERIODS = ['Week', 'Month', 'Year'];

export default function WasteDashboardScreen() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const [period, setPeriod] = useState('Month');
  const [metrics, setMetrics] = useState<WasteMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.household_id) {
      fetchWasteMetrics(user.household_id, period.toLowerCase())
        .then(setMetrics)
        .finally(() => setIsLoading(false));
    } else {
      // Demo data
      setMetrics({
        monthly_waste_score: 87,
        money_saved: 42.5,
        money_wasted: 6.25,
        co2_saved_kg: 3.2,
        items_rescued: 18,
        items_wasted: 3,
        most_wasted: [
          { ingredient_name: 'Spinach', count: 4, total_value: 8.0 },
          { ingredient_name: 'Bread', count: 3, total_value: 9.0 },
          { ingredient_name: 'Avocados', count: 3, total_value: 6.0 },
          { ingredient_name: 'Strawberries', count: 2, total_value: 7.0 },
        ],
        trend: 'improving',
      });
      setIsLoading(false);
    }
  }, [user?.household_id, period]);

  if (isLoading || !metrics) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading insights...</Text>
      </SafeAreaView>
    );
  }

  const trendIcon = metrics.trend === 'improving' ? 'arrow-up' : metrics.trend === 'declining' ? 'arrow-down' : 'minus';
  const trendColor = metrics.trend === 'improving' ? '#4CAF50' : metrics.trend === 'declining' ? '#F44336' : '#999';

  return (
    <>
      <ExpoStack.Screen options={{ title: 'Waste Insights', headerShown: true }} />
      <ScrollView style={styles.container}>
        {/* Period selector */}
        <View style={styles.periodSelector}>
          {PERIODS.map((p) => (
            <TouchableOpacity
              key={p}
              style={[styles.periodTab, period === p && styles.periodTabActive]}
              onPress={() => setPeriod(p)}
            >
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Hero score card */}
        <FadeInView delay={50}>
          <View style={styles.heroCard}>
            <Text style={styles.heroLabel}>Waste Score</Text>
            <View style={styles.heroScoreRow}>
              <CountUp to={metrics.monthly_waste_score} suffix="%" duration={1200} style={styles.heroScore} />
              <View style={[styles.trendBadge, { backgroundColor: trendColor + '20' }]}>
                <FontAwesome name={trendIcon as any} size={12} color={trendColor} />
                <Text style={[styles.trendText, { color: trendColor }]}>{metrics.trend}</Text>
              </View>
            </View>
            <Text style={styles.heroHint}>
              {metrics.items_rescued} of {metrics.items_rescued + metrics.items_wasted} items used before expiry
            </Text>
            <View style={styles.scoreBarBg}>
              <View style={[styles.scoreBarFill, { width: `${metrics.monthly_waste_score}%` }]} />
            </View>
          </View>
        </FadeInView>

        {/* Money + CO2 */}
        <View style={styles.metricsRow}>
          <FadeInView delay={150} style={{ flex: 1 }}>
            <View style={[styles.metricCard, { backgroundColor: '#E8F5E9' }]}>
              <FontAwesome name="dollar" size={20} color={Colors.brand.primary} />
              <CountUp to={metrics.money_saved} prefix="$" decimals={2} duration={1200} style={styles.metricValue} />
              <Text style={styles.metricLabel}>Money Saved</Text>
            </View>
          </FadeInView>
          <FadeInView delay={250} style={{ flex: 1 }}>
            <View style={[styles.metricCard, { backgroundColor: '#FFEBEE' }]}>
              <FontAwesome name="trash" size={20} color="#D32F2F" />
              <CountUp to={metrics.money_wasted} prefix="$" decimals={2} duration={1200} style={[styles.metricValue, { color: '#D32F2F' }]} />
              <Text style={styles.metricLabel}>Money Wasted</Text>
            </View>
          </FadeInView>
          <FadeInView delay={350} style={{ flex: 1 }}>
            <View style={[styles.metricCard, { backgroundColor: '#E3F2FD' }]}>
              <FontAwesome name="leaf" size={20} color="#1976D2" />
              <CountUp to={metrics.co2_saved_kg} suffix="kg" decimals={1} duration={1200} style={[styles.metricValue, { color: '#1976D2' }]} />
              <Text style={styles.metricLabel}>CO2 Avoided</Text>
            </View>
          </FadeInView>
        </View>

        {/* Most wasted items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Most Wasted Items</Text>
          <Text style={styles.sectionSubtitle}>Items you consistently throw away</Text>
          {metrics.most_wasted.map((item, idx) => (
            <View key={idx} style={styles.wasteItem}>
              <View style={styles.wasteRank}>
                <Text style={styles.wasteRankText}>{idx + 1}</Text>
              </View>
              <View style={styles.wasteInfo}>
                <Text style={styles.wasteName}>{item.ingredient_name}</Text>
                <Text style={styles.wasteDetail}>
                  Wasted {item.count} times this {period.toLowerCase()}
                </Text>
              </View>
              <Text style={styles.wasteValue}>${item.total_value.toFixed(2)}</Text>
            </View>
          ))}
        </View>

        {/* AI Suggestions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Smart Suggestions</Text>
          {[
            {
              icon: 'lightbulb-o',
              title: 'Buy half the spinach',
              text: 'You waste spinach 4 out of 6 times. Try buying smaller bags.',
              color: '#FFC107',
            },
            {
              icon: 'snowflake-o',
              title: 'Freeze bread sooner',
              text: 'Your bread expires before you finish it. Freeze half on day 1.',
              color: '#2196F3',
            },
            {
              icon: 'magic',
              title: 'Stock fewer avocados',
              text: 'Optimal qty: 2 per week based on your usage patterns.',
              color: '#7C4DFF',
            },
          ].map((s, i) => (
            <View key={i} style={styles.suggestionCard}>
              <View style={[styles.suggestionIcon, { backgroundColor: s.color + '20' }]}>
                <FontAwesome name={s.icon as any} size={18} color={s.color} />
              </View>
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionTitle}>{s.title}</Text>
                <Text style={styles.suggestionText}>{s.text}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Leaderboard */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Household Leaderboard</Text>
          {[
            { name: 'You', score: 87, rank: 1 },
            { name: 'Roommate Alex', score: 72, rank: 2 },
            { name: 'Roommate Sam', score: 65, rank: 3 },
          ].map((p) => (
            <View key={p.name} style={styles.leaderRow}>
              <Text style={styles.leaderRank}>#{p.rank}</Text>
              <Text style={styles.leaderName}>{p.name}</Text>
              <Text style={styles.leaderScore}>{p.score}%</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  loadingText: { textAlign: 'center', marginTop: 60, color: '#999' },
  periodSelector: { flexDirection: 'row', backgroundColor: '#fff', margin: 16, marginBottom: 8, borderRadius: 12, padding: 4 },
  periodTab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8 },
  periodTabActive: { backgroundColor: Colors.brand.primary },
  periodText: { fontSize: 13, fontWeight: '600', color: '#666' },
  periodTextActive: { color: '#fff' },
  heroCard: { backgroundColor: '#fff', margin: 16, marginTop: 8, borderRadius: 16, padding: 24 },
  heroLabel: { fontSize: 13, color: '#999', fontWeight: '600' },
  heroScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  heroScore: { fontSize: 56, fontWeight: '800', color: Colors.brand.primary },
  trendBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  trendText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  heroHint: { fontSize: 13, color: '#666', marginTop: 4 },
  scoreBarBg: { height: 8, backgroundColor: '#F0F0F0', borderRadius: 4, marginTop: 16 },
  scoreBarFill: { height: 8, backgroundColor: Colors.brand.primary, borderRadius: 4 },
  metricsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8 },
  metricCard: { flex: 1, padding: 16, borderRadius: 12, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginTop: 6 },
  metricLabel: { fontSize: 11, color: '#666', marginTop: 2, textAlign: 'center' },
  section: { backgroundColor: '#fff', margin: 16, marginTop: 12, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  sectionSubtitle: { fontSize: 12, color: '#999', marginTop: 2, marginBottom: 12 },
  wasteItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  wasteRank: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFF3E0', alignItems: 'center', justifyContent: 'center' },
  wasteRankText: { fontSize: 12, fontWeight: '700', color: '#FF6D00' },
  wasteInfo: { flex: 1, marginLeft: 12 },
  wasteName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  wasteDetail: { fontSize: 12, color: '#999', marginTop: 1 },
  wasteValue: { fontSize: 14, fontWeight: '600', color: '#D32F2F' },
  suggestionCard: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  suggestionIcon: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  suggestionContent: { flex: 1 },
  suggestionTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  suggestionText: { fontSize: 12, color: '#666', marginTop: 2, lineHeight: 18 },
  leaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  leaderRank: { fontSize: 14, fontWeight: '700', color: Colors.brand.primary, width: 32 },
  leaderName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  leaderScore: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
});
