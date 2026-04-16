import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { PressableScale, FadeInView } from '@/components/Animated';

export default function EditProfileScreen() {
  const { user, updateProfile, signOut } = useAuthStore();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await updateProfile({ display_name: displayName.trim() } as any);
    setSaving(false);
    Alert.alert('Saved', 'Profile updated', [{ text: 'OK', onPress: () => router.back() }]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This permanently deletes your account, inventory, recipes, and all data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Forever',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Account Deletion', 'Contact support@freshscan.app to complete deletion.');
          },
        },
      ]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Edit Profile', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <FadeInView>
            <View style={styles.avatarSection}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {displayName[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                </Text>
              </View>
              <Text style={styles.email}>{user?.email}</Text>
            </View>
          </FadeInView>

          <FadeInView delay={100}>
            <View style={styles.section}>
              <Text style={styles.label}>Display Name</Text>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor="#999"
              />

              <Text style={styles.label}>Email</Text>
              <View style={[styles.input, styles.inputDisabled]}>
                <Text style={styles.disabledText}>{user?.email}</Text>
              </View>
              <Text style={styles.hint}>Email can't be changed. Contact support to migrate.</Text>

              <PressableScale
                style={[styles.saveButton, saving && styles.disabled]}
                onPress={handleSave}
                disabled={saving || displayName === user?.display_name}
              >
                <Text style={styles.saveText}>{saving ? 'Saving...' : 'Save Changes'}</Text>
              </PressableScale>
            </View>
          </FadeInView>

          <FadeInView delay={200}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Info</Text>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>User ID</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{user?.id?.slice(0, 8)}...</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Joined</Text>
                <Text style={styles.infoValue}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Auth provider</Text>
                <Text style={styles.infoValue}>{user?.auth_provider || 'email'}</Text>
              </View>
            </View>
          </FadeInView>

          <FadeInView delay={300}>
            <View style={styles.dangerSection}>
              <Text style={styles.dangerTitle}>Danger Zone</Text>
              <PressableScale style={styles.dangerButton} onPress={signOut}>
                <FontAwesome name="sign-out" size={14} color="#D32F2F" />
                <Text style={styles.dangerButtonText}>Sign Out</Text>
              </PressableScale>
              <PressableScale style={styles.dangerButton} onPress={handleDeleteAccount}>
                <FontAwesome name="trash" size={14} color="#D32F2F" />
                <Text style={styles.dangerButtonText}>Delete Account</Text>
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
  avatarSection: { alignItems: 'center', paddingVertical: 24, backgroundColor: '#fff', borderRadius: 14, marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#fff' },
  email: { fontSize: 14, color: '#666', marginTop: 12 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  label: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 10 },
  input: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1a1a1a', backgroundColor: '#FAFAFA' },
  inputDisabled: { backgroundColor: '#F0F0F0' },
  disabledText: { fontSize: 15, color: '#999' },
  hint: { fontSize: 11, color: '#999', marginTop: 4 },
  saveButton: { backgroundColor: Colors.brand.primary, borderRadius: 10, padding: 14, alignItems: 'center', marginTop: 20 },
  saveText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  infoLabel: { fontSize: 13, color: '#999' },
  infoValue: { fontSize: 13, color: '#333', fontWeight: '500', fontVariant: ['tabular-nums'] },
  dangerSection: { backgroundColor: '#fff', borderRadius: 14, padding: 16 },
  dangerTitle: { fontSize: 14, fontWeight: '700', color: '#D32F2F', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  dangerButton: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FFEBEE', marginBottom: 8 },
  dangerButtonText: { fontSize: 14, fontWeight: '600', color: '#D32F2F' },
});
