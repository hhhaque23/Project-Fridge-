import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import {
  requestPermission,
  showTestNotification,
  scheduleWeeklyDigest,
  cancelAllScheduled,
  DEFAULT_CONFIG,
  type NotificationConfig,
} from '@/services/notificationService';

const ALLERGIES = ['Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs', 'Milk', 'Soy', 'Wheat', 'Sesame'];
const DIETS = ['None', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Halal', 'Kosher', 'Mediterranean', 'Gluten-Free'];
const INTOLERANCES = ['Lactose', 'Gluten', 'FODMAP', 'Fructose'];

export default function SettingsScreen() {
  const { user, updateProfile } = useAuthStore();

  // Dietary profile state
  const [allergies, setAllergies] = useState<string[]>(user?.dietary_profile?.allergies || []);
  const [intolerances, setIntolerances] = useState<string[]>(user?.dietary_profile?.intolerances || []);
  const [dietType, setDietType] = useState(user?.dietary_profile?.diet_type || 'None');
  const [calorieTarget, setCalorieTarget] = useState(
    user?.dietary_profile?.calorie_target?.toString() || ''
  );

  // Notification settings
  const [notifConfig, setNotifConfig] = useState<NotificationConfig>(DEFAULT_CONFIG);
  const [notifPermission, setNotifPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (user?.notification_preferences) {
      setNotifConfig({
        ...DEFAULT_CONFIG,
        ...(user.notification_preferences as any),
      });
    }
  }, [user?.notification_preferences]);

  const toggleItem = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) setList(list.filter((i) => i !== item));
    else setList([...list, item]);
  };

  const saveDietary = async () => {
    await updateProfile({
      dietary_profile: {
        allergies,
        intolerances,
        diet_type: dietType === 'None' ? null : dietType,
        calorie_target: calorieTarget ? parseInt(calorieTarget, 10) : null,
        macro_split: user?.dietary_profile?.macro_split || null,
      },
    } as any);
    Alert.alert('Saved', 'Dietary profile updated');
  };

  const saveNotifications = async () => {
    await updateProfile({
      notification_preferences: {
        ...notifConfig,
        quiet_hours: { start: notifConfig.quiet_hours_start, end: notifConfig.quiet_hours_end },
      },
    } as any);
    if (notifConfig.weekly_report) {
      await scheduleWeeklyDigest();
    } else {
      await cancelAllScheduled();
    }
    Alert.alert('Saved', 'Notification preferences updated');
  };

  const requestNotifAccess = async () => {
    const granted = await requestPermission();
    setNotifPermission(granted);
    if (!granted) {
      Alert.alert(
        'Permission Denied',
        'Notifications are disabled. Enable them in your device settings.'
      );
    }
  };

  const sendTestNotification = async () => {
    const ok = await showTestNotification();
    if (!ok) Alert.alert('Test Failed', 'Could not send notification. Check permissions.');
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Settings', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Dietary profile */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Dietary Profile</Text>

            <Text style={styles.label}>Diet Type</Text>
            <View style={styles.chipGrid}>
              {DIETS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, dietType === d && styles.chipActive]}
                  onPress={() => setDietType(d)}
                >
                  <Text style={[styles.chipText, dietType === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Allergies</Text>
            <View style={styles.chipGrid}>
              {ALLERGIES.map((a) => (
                <TouchableOpacity
                  key={a}
                  style={[styles.chip, allergies.includes(a) && styles.chipActive]}
                  onPress={() => toggleItem(a, allergies, setAllergies)}
                >
                  <Text style={[styles.chipText, allergies.includes(a) && styles.chipTextActive]}>{a}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Intolerances</Text>
            <View style={styles.chipGrid}>
              {INTOLERANCES.map((i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.chip, intolerances.includes(i) && styles.chipActive]}
                  onPress={() => toggleItem(i, intolerances, setIntolerances)}
                >
                  <Text style={[styles.chipText, intolerances.includes(i) && styles.chipTextActive]}>{i}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Daily Calorie Target (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 2000"
              placeholderTextColor="#999"
              keyboardType="number-pad"
              value={calorieTarget}
              onChangeText={setCalorieTarget}
            />

            <TouchableOpacity style={styles.saveButton} onPress={saveDietary}>
              <Text style={styles.saveButtonText}>Save Dietary Profile</Text>
            </TouchableOpacity>
          </View>

          {/* Notifications */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notifications</Text>

            {notifPermission === false && (
              <View style={styles.permissionWarn}>
                <FontAwesome name="exclamation-triangle" size={14} color="#D32F2F" />
                <Text style={styles.permissionWarnText}>
                  Notifications are disabled. Enable in device settings.
                </Text>
              </View>
            )}

            <TouchableOpacity style={styles.testButton} onPress={requestNotifAccess}>
              <FontAwesome name="check-circle" size={14} color={Colors.brand.primary} />
              <Text style={styles.testButtonText}>Request Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.testButton} onPress={sendTestNotification}>
              <FontAwesome name="bell" size={14} color={Colors.brand.primary} />
              <Text style={styles.testButtonText}>Send Test Notification</Text>
            </TouchableOpacity>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Expiry Alerts</Text>
                <Text style={styles.toggleHint}>Notify 1 day before items expire</Text>
              </View>
              <Switch
                value={notifConfig.expiry_alerts}
                onValueChange={(v) => setNotifConfig((c) => ({ ...c, expiry_alerts: v }))}
                trackColor={{ false: '#DDD', true: Colors.brand.primaryLight }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Weekly Waste Report</Text>
                <Text style={styles.toggleHint}>Sunday digest of money saved</Text>
              </View>
              <Switch
                value={notifConfig.weekly_report}
                onValueChange={(v) => setNotifConfig((c) => ({ ...c, weekly_report: v }))}
                trackColor={{ false: '#DDD', true: Colors.brand.primaryLight }}
              />
            </View>

            <View style={styles.toggleRow}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>Scan Reminders</Text>
                <Text style={styles.toggleHint}>If you haven't scanned in 5+ days</Text>
              </View>
              <Switch
                value={notifConfig.scan_reminders}
                onValueChange={(v) => setNotifConfig((c) => ({ ...c, scan_reminders: v }))}
                trackColor={{ false: '#DDD', true: Colors.brand.primaryLight }}
              />
            </View>

            <Text style={styles.label}>Frequency</Text>
            <View style={styles.frequencyRow}>
              {(['realtime', 'daily_digest', 'weekly_summary'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  style={[styles.freqChip, notifConfig.frequency === f && styles.freqChipActive]}
                  onPress={() => setNotifConfig((c) => ({ ...c, frequency: f }))}
                >
                  <Text style={[styles.freqText, notifConfig.frequency === f && styles.freqTextActive]}>
                    {f === 'realtime' ? 'Real-time' : f === 'daily_digest' ? 'Daily' : 'Weekly'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.timeRow}>
              <View style={styles.timeCol}>
                <Text style={styles.label}>Quiet hours start</Text>
                <TextInput
                  style={styles.input}
                  value={notifConfig.quiet_hours_start}
                  onChangeText={(v) => setNotifConfig((c) => ({ ...c, quiet_hours_start: v }))}
                  placeholder="22:00"
                />
              </View>
              <View style={styles.timeCol}>
                <Text style={styles.label}>Quiet hours end</Text>
                <TextInput
                  style={styles.input}
                  value={notifConfig.quiet_hours_end}
                  onChangeText={(v) => setNotifConfig((c) => ({ ...c, quiet_hours_end: v }))}
                  placeholder="08:00"
                />
              </View>
            </View>

            <TouchableOpacity style={styles.saveButton} onPress={saveNotifications}>
              <Text style={styles.saveButtonText}>Save Notification Settings</Text>
            </TouchableOpacity>
          </View>

          {/* Subscription */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription</Text>
            <View style={styles.tierCard}>
              <View style={styles.tierHeader}>
                <View>
                  <Text style={styles.tierName}>{user?.subscription_tier || 'Free'} Plan</Text>
                  <Text style={styles.tierStatus}>Active</Text>
                </View>
                <View style={styles.tierBadge}>
                  <FontAwesome name="star" size={14} color={Colors.brand.accent} />
                </View>
              </View>
              <View style={styles.tierFeatures}>
                {(user?.subscription_tier === 'Pro' || user?.subscription_tier === 'Family')
                  ? ['Unlimited scans', 'AI recipes', 'Meal planner', 'Household sharing'].map((f) => (
                      <View key={f} style={styles.featureRow}>
                        <FontAwesome name="check" size={11} color={Colors.brand.primary} />
                        <Text style={styles.featureText}>{f}</Text>
                      </View>
                    ))
                  : ['5 scans/week', 'Basic recipes', 'Manual entry', 'Single user'].map((f) => (
                      <View key={f} style={styles.featureRow}>
                        <FontAwesome name="check" size={11} color="#999" />
                        <Text style={[styles.featureText, { color: '#999' }]}>{f}</Text>
                      </View>
                    ))}
              </View>
              {user?.subscription_tier !== 'Pro' && user?.subscription_tier !== 'Family' && (
                <TouchableOpacity style={styles.upgradeButton}>
                  <Text style={styles.upgradeText}>Upgrade to Pro - $4.99/mo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16, paddingBottom: 32 },
  section: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginTop: 12, marginBottom: 8 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#F5F5F5', borderWidth: 1, borderColor: '#EEE' },
  chipActive: { backgroundColor: '#E8F5E9', borderColor: Colors.brand.primary },
  chipText: { fontSize: 12, color: '#666', fontWeight: '500' },
  chipTextActive: { color: Colors.brand.primary, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 14, color: '#1a1a1a', backgroundColor: '#FAFAFA' },
  saveButton: { backgroundColor: Colors.brand.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 16 },
  saveButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  toggleHint: { fontSize: 12, color: '#999', marginTop: 2 },
  frequencyRow: { flexDirection: 'row', gap: 6 },
  freqChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, backgroundColor: '#F5F5F5' },
  freqChipActive: { backgroundColor: Colors.brand.primary },
  freqText: { fontSize: 12, fontWeight: '600', color: '#666' },
  freqTextActive: { color: '#fff' },
  timeRow: { flexDirection: 'row', gap: 10 },
  timeCol: { flex: 1 },
  testButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.brand.primary, marginBottom: 8 },
  testButtonText: { color: Colors.brand.primary, fontSize: 13, fontWeight: '600' },
  permissionWarn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFEBEE', borderRadius: 8, padding: 10, marginBottom: 12 },
  permissionWarnText: { flex: 1, fontSize: 12, color: '#D32F2F' },
  tierCard: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 14 },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  tierName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  tierStatus: { fontSize: 12, color: Colors.brand.primary, fontWeight: '600', marginTop: 2 },
  tierBadge: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#FFF8E1', alignItems: 'center', justifyContent: 'center' },
  tierFeatures: { gap: 6, marginBottom: 12 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  featureText: { fontSize: 13, color: '#333' },
  upgradeButton: { backgroundColor: Colors.brand.accent, borderRadius: 10, padding: 12, alignItems: 'center' },
  upgradeText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
