import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Linking,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { PressableScale, FadeInView } from '@/components/Animated';

const FAQS = [
  {
    q: 'How does the AI Vision scanner work?',
    a: 'You take a photo of a fridge shelf or section. The app sends it to Claude (Anthropic\'s AI) which identifies every visible food item, estimates quantity, and assigns a confidence score. Items above 85% confidence auto-add; 60-85% ask for confirmation; below 60% need manual identification.',
  },
  {
    q: 'Do my photos get stored?',
    a: 'Photos are sent to Claude for analysis and deleted within 24 hours. We never keep long-term photo storage unless you opt in.',
  },
  {
    q: 'How accurate is the AI?',
    a: 'For common packaged items: 90%+. For loose produce: 80-85%. It improves over time as you correct mistakes — your corrections train a personal prompt addendum.',
  },
  {
    q: 'Why does milk expire in 2 days when the carton says 2 weeks?',
    a: 'Once opened, the clock restarts. The app uses USDA FoodKeeper data for opened shelf life. You can toggle "sealed" on any item to use the printed date instead.',
  },
  {
    q: 'What\'s a Cook Now recipe?',
    a: 'Recipes where you already have 100% of the ingredients. No shopping required. Sorted by expiry urgency so you cook what\'s about to go bad first.',
  },
  {
    q: 'How do I share with my household?',
    a: 'Profile → Household → Create a household and share the 8-character invite code. Anyone with the code can join and see the shared inventory + grocery list.',
  },
  {
    q: 'Does this work offline?',
    a: 'Partially. You can view your inventory and recipes offline. Scanning requires internet (Claude API).',
  },
  {
    q: 'How do I cancel my Pro subscription?',
    a: 'Apple/Google manage subscriptions. iOS: Settings → [Your Name] → Subscriptions. Android: Play Store → Profile → Payments & subscriptions.',
  },
];

export default function HelpScreen() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <>
      <Stack.Screen options={{ title: 'Help & FAQ', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <FadeInView>
            <View style={styles.heroSection}>
              <View style={styles.heroIcon}>
                <FontAwesome name="question" size={32} color={Colors.brand.primary} />
              </View>
              <Text style={styles.heroTitle}>How can we help?</Text>
              <Text style={styles.heroSubtitle}>Common questions and contact info</Text>
            </View>
          </FadeInView>

          {/* Contact options */}
          <FadeInView delay={100}>
            <View style={styles.contactRow}>
              <PressableScale
                style={styles.contactCard}
                onPress={() => Linking.openURL('mailto:support@freshscan.app')}
              >
                <FontAwesome name="envelope" size={22} color={Colors.brand.primary} />
                <Text style={styles.contactLabel}>Email</Text>
                <Text style={styles.contactHint}>support@freshscan.app</Text>
              </PressableScale>
              <PressableScale
                style={styles.contactCard}
                onPress={() =>
                  Alert.alert('Live Chat', 'Live chat is coming in v1.1. For now, email us — we reply within 24 hours.')
                }
              >
                <FontAwesome name="comments" size={22} color={Colors.brand.primary} />
                <Text style={styles.contactLabel}>Live Chat</Text>
                <Text style={styles.contactHint}>Coming v1.1</Text>
              </PressableScale>
            </View>
          </FadeInView>

          {/* FAQs */}
          <FadeInView delay={200}>
            <Text style={styles.sectionTitle}>Frequently Asked</Text>
          </FadeInView>

          {FAQS.map((faq, idx) => (
            <FadeInView key={idx} delay={250 + idx * 40}>
              <PressableScale
                style={styles.faqCard}
                onPress={() => setOpenFaq(openFaq === idx ? null : idx)}
                scaleTo={0.99}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{faq.q}</Text>
                  <FontAwesome
                    name={openFaq === idx ? 'chevron-up' : 'chevron-down'}
                    size={12}
                    color="#999"
                  />
                </View>
                {openFaq === idx && <Text style={styles.faqAnswer}>{faq.a}</Text>}
              </PressableScale>
            </FadeInView>
          ))}

          <FadeInView delay={600}>
            <View style={styles.footer}>
              <Text style={styles.footerText}>Can't find what you're looking for?</Text>
              <PressableScale
                style={styles.footerButton}
                onPress={() => Linking.openURL('mailto:support@freshscan.app')}
              >
                <Text style={styles.footerButtonText}>Contact Support</Text>
              </PressableScale>
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
  heroSection: { alignItems: 'center', paddingVertical: 20 },
  heroIcon: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  heroSubtitle: { fontSize: 13, color: '#666', marginTop: 4 },
  contactRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  contactCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, alignItems: 'center', gap: 6 },
  contactLabel: { fontSize: 14, fontWeight: '700', color: '#1a1a1a', marginTop: 4 },
  contactHint: { fontSize: 11, color: '#999', textAlign: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  faqCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  faqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQuestion: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginRight: 12 },
  faqAnswer: { fontSize: 13, color: '#666', marginTop: 10, lineHeight: 20 },
  footer: { alignItems: 'center', paddingVertical: 24 },
  footerText: { fontSize: 13, color: '#999', marginBottom: 12 },
  footerButton: { backgroundColor: Colors.brand.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 10 },
  footerButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
