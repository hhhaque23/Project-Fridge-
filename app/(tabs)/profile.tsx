import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const { user, signOut } = useAuthStore();
  const router = useRouter();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  };

  const sections = [
    {
      title: 'Account',
      items: [
        { icon: 'user', label: 'Edit Profile', onPress: () => {} },
        { icon: 'users', label: 'Household', subtitle: user?.household_id ? 'Manage members' : 'Create or join', onPress: () => router.push('/household' as any) },
        { icon: 'bell', label: 'Notifications', onPress: () => {} },
      ],
    },
    {
      title: 'Dietary & Planning',
      items: [
        { icon: 'heartbeat', label: 'Dietary Profile', subtitle: user?.dietary_profile?.diet_type || 'Not set', onPress: () => router.push('/settings' as any) },
        { icon: 'exclamation-triangle', label: 'Allergies', subtitle: user?.dietary_profile?.allergies?.join(', ') || 'None', onPress: () => router.push('/settings' as any) },
        { icon: 'calendar', label: 'Meal Plan', subtitle: 'Weekly planner', onPress: () => router.push('/meal-plan' as any) },
      ],
    },
    {
      title: 'Insights & Tools',
      items: [
        { icon: 'pie-chart', label: 'Waste Dashboard', subtitle: 'Score, money saved, CO2 avoided', onPress: () => router.push('/waste-dashboard' as any) },
        { icon: 'lightbulb-o', label: 'Storage Advisor', subtitle: 'Tips & ethylene warnings', onPress: () => router.push('/storage-advisor' as any) },
        { icon: 'microphone', label: 'Voice Add', subtitle: 'Add items by voice', onPress: () => router.push('/voice-add' as any) },
        { icon: 'file-text-o', label: 'Receipt Scan', subtitle: 'Auto-import from receipt', onPress: () => router.push('/receipt-scan' as any) },
      ],
    },
    {
      title: 'App',
      items: [
        { icon: 'star', label: 'Subscription', subtitle: user?.subscription_tier || 'Free', onPress: () => router.push('/settings' as any) },
        { icon: 'cog', label: 'Settings', subtitle: 'Notifications, dietary, account', onPress: () => router.push('/settings' as any) },
        { icon: 'question-circle', label: 'Help & FAQ', onPress: () => {} },
        { icon: 'info-circle', label: 'About FreshScan', onPress: () => {} },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Profile header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
            </Text>
          </View>
          <Text style={styles.displayName}>{user?.display_name || 'FreshScan User'}</Text>
          <Text style={styles.email}>{user?.email || ''}</Text>
          <View style={styles.tierBadge}>
            <FontAwesome name="star" size={12} color={Colors.brand.accent} />
            <Text style={styles.tierText}>{user?.subscription_tier || 'Free'} Plan</Text>
          </View>
        </View>

        {/* Waste score card */}
        <TouchableOpacity style={styles.wasteCard} onPress={() => router.push('/waste-dashboard' as any)}>
          <View style={styles.wasteRow}>
            <View style={styles.wasteStat}>
              <Text style={styles.wasteStatValue}>87%</Text>
              <Text style={styles.wasteStatLabel}>Waste Score</Text>
            </View>
            <View style={styles.wasteDivider} />
            <View style={styles.wasteStat}>
              <Text style={[styles.wasteStatValue, { color: Colors.brand.primary }]}>$42</Text>
              <Text style={styles.wasteStatLabel}>Saved this month</Text>
            </View>
            <View style={styles.wasteDivider} />
            <View style={styles.wasteStat}>
              <Text style={styles.wasteStatValue}>3.2kg</Text>
              <Text style={styles.wasteStatLabel}>CO2 avoided</Text>
            </View>
          </View>
        </TouchableOpacity>

        {/* Settings sections */}
        {sections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionCard}>
              {section.items.map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  style={[styles.settingsRow, idx < section.items.length - 1 && styles.settingsRowBorder]}
                  onPress={item.onPress}
                >
                  <FontAwesome name={item.icon as any} size={18} color={Colors.brand.primary} style={styles.settingsIcon} />
                  <View style={styles.settingsInfo}>
                    <Text style={styles.settingsLabel}>{item.label}</Text>
                    {item.subtitle ? (
                      <Text style={styles.settingsSubtitle}>{item.subtitle}</Text>
                    ) : null}
                  </View>
                  <FontAwesome name="chevron-right" size={12} color="#CCC" />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
          <FontAwesome name="sign-out" size={16} color="#D32F2F" />
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <Text style={styles.version}>FreshScan v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { alignItems: 'center', paddingVertical: 32, backgroundColor: '#fff' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  displayName: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', marginTop: 12 },
  email: { fontSize: 14, color: '#999', marginTop: 4 },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, backgroundColor: '#FFF8E1', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  tierText: { fontSize: 13, fontWeight: '600', color: Colors.brand.accent },
  wasteCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  wasteRow: { flexDirection: 'row', alignItems: 'center' },
  wasteStat: { flex: 1, alignItems: 'center' },
  wasteStatValue: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  wasteStatLabel: { fontSize: 11, color: '#999', marginTop: 4, textAlign: 'center' },
  wasteDivider: { width: 1, height: 40, backgroundColor: '#E0E0E0' },
  section: { marginBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#999', paddingHorizontal: 16, paddingVertical: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12 },
  settingsRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  settingsRowBorder: { borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  settingsIcon: { width: 28 },
  settingsInfo: { flex: 1, marginLeft: 8 },
  settingsLabel: { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },
  settingsSubtitle: { fontSize: 12, color: '#999', marginTop: 2 },
  signOutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, padding: 16, backgroundColor: '#fff', borderRadius: 12 },
  signOutText: { fontSize: 16, fontWeight: '600', color: '#D32F2F' },
  version: { textAlign: 'center', fontSize: 12, color: '#CCC', paddingBottom: 32 },
});
