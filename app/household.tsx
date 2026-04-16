import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  Share,
} from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';

interface Member {
  id: string;
  display_name: string;
  email: string;
  is_owner: boolean;
}

export default function HouseholdScreen() {
  const { user, updateProfile } = useAuthStore();
  const [household, setHousehold] = useState<any>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [householdName, setHouseholdName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join' | 'member'>('create');

  useEffect(() => {
    if (user?.household_id) {
      loadHousehold();
    }
  }, [user?.household_id]);

  const loadHousehold = async () => {
    if (!user?.household_id) return;
    const { data: hh } = await supabase
      .from('households')
      .select('*')
      .eq('id', user.household_id)
      .single();
    if (hh) {
      setHousehold(hh);
      setMode('member');
    }
    const { data: ms } = await supabase
      .from('users')
      .select('id, display_name, email')
      .eq('household_id', user.household_id);
    if (ms) {
      setMembers(
        ms.map((m) => ({
          ...m,
          is_owner: m.id === hh?.owner_id,
        }))
      );
    }
  };

  const createHousehold = async () => {
    if (!householdName.trim() || !user) return;
    const { data, error } = await supabase
      .from('households')
      .insert({ name: householdName.trim(), owner_id: user.id })
      .select()
      .single();
    if (error) {
      Alert.alert('Error', error.message);
      return;
    }
    if (data) {
      await updateProfile({ household_id: data.id });
      setHousehold(data);
      setMode('member');
    }
  };

  const joinHousehold = async () => {
    if (!joinCode.trim() || !user) return;
    const { data: hh } = await supabase
      .from('households')
      .select('*')
      .eq('invite_code', joinCode.trim().toLowerCase())
      .single();
    if (!hh) {
      Alert.alert('Not Found', 'Invalid invite code');
      return;
    }
    await updateProfile({ household_id: hh.id });
    setHousehold(hh);
    setMode('member');
  };

  const shareInvite = async () => {
    if (!household) return;
    try {
      await Share.share({
        message: `Join my FreshScan household "${household.name}"! Use invite code: ${household.invite_code}`,
      });
    } catch {}
  };

  const leaveHousehold = () => {
    Alert.alert('Leave Household', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave',
        style: 'destructive',
        onPress: async () => {
          await updateProfile({ household_id: null });
          setHousehold(null);
          setMembers([]);
          setMode('create');
        },
      },
    ]);
  };

  if (mode === 'member' && household) {
    return (
      <>
        <Stack.Screen options={{ title: 'Household', headerShown: true }} />
        <ScrollView style={styles.container}>
          <View style={styles.householdHeader}>
            <View style={styles.householdIcon}>
              <FontAwesome name="users" size={32} color={Colors.brand.primary} />
            </View>
            <Text style={styles.householdName}>{household.name}</Text>
            <Text style={styles.memberCount}>{members.length} member{members.length !== 1 ? 's' : ''}</Text>
          </View>

          {/* Invite code card */}
          <View style={styles.inviteCard}>
            <Text style={styles.inviteLabel}>Invite Code</Text>
            <Text style={styles.inviteCode}>{household.invite_code}</Text>
            <TouchableOpacity style={styles.shareButton} onPress={shareInvite}>
              <FontAwesome name="share" size={14} color="#fff" />
              <Text style={styles.shareButtonText}>Share Invite</Text>
            </TouchableOpacity>
          </View>

          {/* Members list */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Members</Text>
            {members.map((m) => (
              <View key={m.id} style={styles.memberRow}>
                <View style={styles.memberAvatar}>
                  <Text style={styles.memberInitial}>
                    {m.display_name?.[0]?.toUpperCase() || m.email[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>
                    {m.display_name || m.email}
                    {m.id === user?.id ? ' (you)' : ''}
                  </Text>
                  <Text style={styles.memberEmail}>{m.email}</Text>
                </View>
                {m.is_owner && (
                  <View style={styles.ownerBadge}>
                    <Text style={styles.ownerBadgeText}>Owner</Text>
                  </View>
                )}
              </View>
            ))}
          </View>

          {/* Settings */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <TouchableOpacity style={styles.settingRow}>
              <FontAwesome name="dollar" size={18} color={Colors.brand.primary} />
              <Text style={styles.settingLabel}>Cost Splitting</Text>
              <FontAwesome name="chevron-right" size={12} color="#CCC" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingRow}>
              <FontAwesome name="bell" size={18} color={Colors.brand.primary} />
              <Text style={styles.settingLabel}>Shared Notifications</Text>
              <FontAwesome name="chevron-right" size={12} color="#CCC" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.leaveButton} onPress={leaveHousehold}>
            <FontAwesome name="sign-out" size={16} color="#D32F2F" />
            <Text style={styles.leaveButtonText}>Leave Household</Text>
          </TouchableOpacity>
        </ScrollView>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ title: 'Household', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollEmpty}>
          <View style={styles.heroIcon}>
            <FontAwesome name="users" size={56} color={Colors.brand.primary} />
          </View>
          <Text style={styles.heroTitle}>Share with Your Household</Text>
          <Text style={styles.heroSubtitle}>
            Sync your inventory, grocery list, and meal plans with up to 12 members.
          </Text>

          {/* Tab switcher */}
          <View style={styles.tabSwitcher}>
            <TouchableOpacity
              style={[styles.tab, mode === 'create' && styles.tabActive]}
              onPress={() => setMode('create')}
            >
              <Text style={[styles.tabText, mode === 'create' && styles.tabTextActive]}>Create</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, mode === 'join' && styles.tabActive]}
              onPress={() => setMode('join')}
            >
              <Text style={[styles.tabText, mode === 'join' && styles.tabTextActive]}>Join</Text>
            </TouchableOpacity>
          </View>

          {mode === 'create' ? (
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Household Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. The Smith Family"
                placeholderTextColor="#999"
                value={householdName}
                onChangeText={setHouseholdName}
              />
              <TouchableOpacity
                style={[styles.primaryButton, !householdName.trim() && styles.buttonDisabled]}
                onPress={createHousehold}
                disabled={!householdName.trim()}
              >
                <Text style={styles.primaryButtonText}>Create Household</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formCard}>
              <Text style={styles.formLabel}>Invite Code</Text>
              <TextInput
                style={styles.input}
                placeholder="abc12345"
                placeholderTextColor="#999"
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={[styles.primaryButton, !joinCode.trim() && styles.buttonDisabled]}
                onPress={joinHousehold}
                disabled={!joinCode.trim()}
              >
                <Text style={styles.primaryButtonText}>Join Household</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollEmpty: { padding: 24, alignItems: 'center' },
  heroIcon: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginTop: 24, marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  heroSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 280 },
  tabSwitcher: { flexDirection: 'row', backgroundColor: '#fff', borderRadius: 12, marginTop: 24, padding: 4 },
  tab: { paddingVertical: 10, paddingHorizontal: 32, borderRadius: 8 },
  tabActive: { backgroundColor: Colors.brand.primary },
  tabText: { fontSize: 14, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  formCard: { backgroundColor: '#fff', borderRadius: 16, padding: 20, marginTop: 16, alignSelf: 'stretch' },
  formLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 15, color: '#1a1a1a', backgroundColor: '#FAFAFA' },
  primaryButton: { backgroundColor: Colors.brand.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 12 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
  // Member view
  householdHeader: { alignItems: 'center', padding: 24, backgroundColor: '#fff' },
  householdIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  householdName: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  memberCount: { fontSize: 13, color: '#999', marginTop: 4 },
  inviteCard: { margin: 16, backgroundColor: '#fff', borderRadius: 16, padding: 20, alignItems: 'center' },
  inviteLabel: { fontSize: 12, color: '#999', fontWeight: '600' },
  inviteCode: { fontSize: 32, fontWeight: '700', color: Colors.brand.primary, letterSpacing: 4, marginVertical: 8, fontVariant: ['tabular-nums'] },
  shareButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.brand.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  shareButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  section: { backgroundColor: '#fff', margin: 16, marginTop: 0, borderRadius: 16, padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  memberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10 },
  memberAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { color: '#fff', fontSize: 16, fontWeight: '700' },
  memberInfo: { flex: 1, marginLeft: 12 },
  memberName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  memberEmail: { fontSize: 12, color: '#999' },
  ownerBadge: { backgroundColor: '#FFF8E1', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  ownerBadgeText: { fontSize: 11, fontWeight: '700', color: '#FF6D00' },
  settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  settingLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  leaveButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 16, padding: 14, backgroundColor: '#fff', borderRadius: 12 },
  leaveButtonText: { fontSize: 15, fontWeight: '600', color: '#D32F2F' },
});
