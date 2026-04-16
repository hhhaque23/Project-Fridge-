import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
} from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { PressableScale, FadeInView } from '@/components/Animated';

export default function AboutScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'About FreshScan', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <FadeInView>
            <View style={styles.heroSection}>
              <View style={styles.heroLogo}>
                <Text style={styles.logoText}>F</Text>
              </View>
              <Text style={styles.appName}>FreshScan</Text>
              <Text style={styles.tagline}>AI Fridge Scanner + Expiry-First Recipes</Text>
              <Text style={styles.version}>Version 1.0.0</Text>
            </View>
          </FadeInView>

          <FadeInView delay={100}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Our Mission</Text>
              <Text style={styles.paragraph}>
                40% of food in American homes gets thrown away. FreshScan gives you a digital twin of your kitchen that actually works — no manual data entry, no wrong expiry dates, no forgetting what you have.
              </Text>
              <Text style={styles.paragraph}>
                We believe AI should work for regular people, not just enterprises. If an AI can recognize your fridge contents, suggest recipes that use expiring items, and help you waste less food, we've done our job.
              </Text>
            </View>
          </FadeInView>

          <FadeInView delay={200}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Built With</Text>
              <View style={styles.techGrid}>
                {[
                  { name: 'React Native', icon: 'mobile' },
                  { name: 'Expo', icon: 'rocket' },
                  { name: 'Claude Vision', icon: 'eye' },
                  { name: 'Supabase', icon: 'database' },
                  { name: 'TypeScript', icon: 'code' },
                  { name: 'PostgreSQL', icon: 'server' },
                ].map((t) => (
                  <View key={t.name} style={styles.techItem}>
                    <FontAwesome name={t.icon as any} size={16} color={Colors.brand.primary} />
                    <Text style={styles.techText}>{t.name}</Text>
                  </View>
                ))}
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={300}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Links</Text>
              {[
                { label: 'Privacy Policy', url: 'https://freshscan.app/privacy', icon: 'lock' },
                { label: 'Terms of Service', url: 'https://freshscan.app/terms', icon: 'file-text-o' },
                { label: 'Open Source Licenses', url: 'https://freshscan.app/licenses', icon: 'code' },
                { label: 'Contact Support', url: 'mailto:support@freshscan.app', icon: 'envelope' },
              ].map((link) => (
                <PressableScale
                  key={link.label}
                  style={styles.linkRow}
                  onPress={() => Linking.openURL(link.url)}
                  scaleTo={0.98}
                >
                  <FontAwesome name={link.icon as any} size={14} color={Colors.brand.primary} />
                  <Text style={styles.linkText}>{link.label}</Text>
                  <FontAwesome name="external-link" size={12} color="#CCC" />
                </PressableScale>
              ))}
            </View>
          </FadeInView>

          <FadeInView delay={400}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stats</Text>
              <View style={styles.statsRow}>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>2,000+</Text>
                  <Text style={styles.statLabel}>Recipes</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>5,000+</Text>
                  <Text style={styles.statLabel}>Ingredients</Text>
                </View>
                <View style={styles.statBox}>
                  <Text style={styles.statValue}>16</Text>
                  <Text style={styles.statLabel}>Novel Features</Text>
                </View>
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={500}>
            <View style={styles.credits}>
              <Text style={styles.creditsText}>
                Made with care to help reduce food waste. Data from USDA FoodKeeper and Open Food Facts.
              </Text>
              <Text style={styles.copyright}>© 2026 FreshScan</Text>
            </View>
          </FadeInView>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16 },
  heroSection: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff', borderRadius: 16, marginBottom: 12 },
  heroLogo: { width: 80, height: 80, borderRadius: 20, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 40, fontWeight: '800', color: '#fff' },
  appName: { fontSize: 26, fontWeight: '800', color: '#1a1a1a', marginTop: 16 },
  tagline: { fontSize: 14, color: '#666', marginTop: 4 },
  version: { fontSize: 12, color: '#999', marginTop: 8 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  paragraph: { fontSize: 13, color: '#555', lineHeight: 20, marginBottom: 10 },
  techGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  techItem: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16 },
  techText: { fontSize: 12, fontWeight: '600', color: '#333' },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  linkText: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  statsRow: { flexDirection: 'row', gap: 8 },
  statBox: { flex: 1, alignItems: 'center', padding: 12, backgroundColor: '#FAFAFA', borderRadius: 10 },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.brand.primary },
  statLabel: { fontSize: 11, color: '#666', marginTop: 2 },
  credits: { alignItems: 'center', paddingVertical: 24 },
  creditsText: { fontSize: 12, color: '#999', textAlign: 'center', lineHeight: 18, maxWidth: 320 },
  copyright: { fontSize: 11, color: '#CCC', marginTop: 8 },
});
