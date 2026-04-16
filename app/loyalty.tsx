import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import {
  getAllProviders,
  getProviderInfo,
  connectLoyaltyAccount,
  disconnectLoyaltyAccount,
  syncRecentPurchases,
  type LoyaltyAccount,
  type LoyaltyProvider,
  type LoyaltyPurchase,
} from '@/services/loyaltyService';

export default function LoyaltyScreen() {
  const [accounts, setAccounts] = useState<LoyaltyAccount[]>([]);
  const [recentPurchases, setRecentPurchases] = useState<LoyaltyPurchase[]>([]);
  const [connecting, setConnecting] = useState<LoyaltyProvider | null>(null);
  const [syncing, setSyncing] = useState<LoyaltyProvider | null>(null);
  const [showConnectModal, setShowConnectModal] = useState<LoyaltyProvider | null>(null);
  const [emailInput, setEmailInput] = useState('');

  const handleConnect = async () => {
    if (!showConnectModal || !emailInput.trim()) return;
    setConnecting(showConnectModal);
    try {
      const account = await connectLoyaltyAccount(showConnectModal, emailInput.trim());
      setAccounts((prev) => [...prev, account]);
      setShowConnectModal(null);
      setEmailInput('');
      // Auto-sync after connecting
      handleSync(showConnectModal);
    } catch {
      Alert.alert('Connection Failed', 'Could not connect account');
    }
    setConnecting(null);
  };

  const handleSync = async (provider: LoyaltyProvider) => {
    setSyncing(provider);
    try {
      const purchases = await syncRecentPurchases(provider);
      setRecentPurchases(purchases);
      const itemCount = purchases.reduce((sum, p) => sum + p.items.length, 0);
      setAccounts((prev) =>
        prev.map((a) => (a.provider === provider ? { ...a, last_sync: new Date().toISOString() } : a))
      );
      Alert.alert('Synced', `Imported ${itemCount} items from ${getProviderInfo(provider).name}`);
    } catch {
      Alert.alert('Sync Failed', 'Could not sync purchases');
    }
    setSyncing(null);
  };

  const handleDisconnect = (provider: LoyaltyProvider) => {
    Alert.alert(
      'Disconnect',
      `Disconnect from ${getProviderInfo(provider).name}? Past imports remain in inventory.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Disconnect',
          style: 'destructive',
          onPress: async () => {
            await disconnectLoyaltyAccount(provider);
            setAccounts((prev) => prev.filter((a) => a.provider !== provider));
          },
        },
      ]
    );
  };

  const totalImported = recentPurchases.reduce((sum, p) => sum + p.items.length, 0);
  const totalSpent = recentPurchases.reduce((sum, p) => sum + p.total, 0);

  return (
    <>
      <Stack.Screen options={{ title: 'Loyalty Sync', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Hero */}
          <View style={styles.hero}>
            <View style={styles.heroIcon}>
              <FontAwesome name="credit-card" size={36} color={Colors.brand.primary} />
            </View>
            <Text style={styles.heroTitle}>Zero-Effort Inventory</Text>
            <Text style={styles.heroSubtitle}>
              Connect a store loyalty account. Items auto-import after every shop. No scanning, no typing.
            </Text>
          </View>

          {/* Stats */}
          {accounts.length > 0 && totalImported > 0 && (
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{totalImported}</Text>
                <Text style={styles.statLabel}>items imported</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>${totalSpent.toFixed(2)}</Text>
                <Text style={styles.statLabel}>tracked spend</Text>
              </View>
            </View>
          )}

          {/* Connected accounts */}
          {accounts.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Connected</Text>
              {accounts.map((account) => {
                const info = getProviderInfo(account.provider);
                return (
                  <View key={account.provider} style={styles.accountCard}>
                    <View style={[styles.providerLogo, { backgroundColor: info.color + '20' }]}>
                      <FontAwesome name={info.logo as any} size={20} color={info.color} />
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{info.name}</Text>
                      <Text style={styles.accountEmail}>{account.email}</Text>
                      <Text style={styles.accountSync}>
                        {account.last_sync
                          ? `Synced ${new Date(account.last_sync).toLocaleDateString()}`
                          : 'Never synced'}
                      </Text>
                    </View>
                    <View style={styles.accountActions}>
                      <TouchableOpacity
                        style={styles.syncButton}
                        onPress={() => handleSync(account.provider)}
                        disabled={syncing === account.provider}
                      >
                        {syncing === account.provider ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <FontAwesome name="refresh" size={12} color="#fff" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDisconnect(account.provider)}>
                        <FontAwesome name="times-circle" size={20} color="#999" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Available providers */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              {accounts.length > 0 ? 'Add Another Store' : 'Connect a Store'}
            </Text>
            {getAllProviders()
              .filter((p) => !accounts.find((a) => a.provider === p))
              .map((provider) => {
                const info = getProviderInfo(provider);
                return (
                  <TouchableOpacity
                    key={provider}
                    style={styles.providerCard}
                    onPress={() => setShowConnectModal(provider)}
                  >
                    <View style={[styles.providerLogo, { backgroundColor: info.color + '20' }]}>
                      <FontAwesome name={info.logo as any} size={20} color={info.color} />
                    </View>
                    <View style={styles.providerInfo}>
                      <Text style={styles.providerName}>{info.name}</Text>
                      <Text style={styles.providerHint}>Connect loyalty account</Text>
                    </View>
                    <FontAwesome name="chevron-right" size={12} color="#CCC" />
                  </TouchableOpacity>
                );
              })}
          </View>

          {/* Recent purchases */}
          {recentPurchases.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Imports</Text>
              {recentPurchases.map((p) => (
                <View key={p.id} style={styles.purchaseCard}>
                  <View style={styles.purchaseHeader}>
                    <Text style={styles.purchaseStore}>{p.store_name}</Text>
                    <Text style={styles.purchaseTotal}>${p.total.toFixed(2)}</Text>
                  </View>
                  <Text style={styles.purchaseDate}>{p.purchase_date}</Text>
                  <Text style={styles.purchaseItems}>
                    {p.items.length} items - {p.items.slice(0, 3).map((i) => i.name).join(', ')}
                    {p.items.length > 3 && '...'}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Privacy note */}
          <View style={styles.privacyCard}>
            <FontAwesome name="lock" size={14} color="#666" />
            <Text style={styles.privacyText}>
              We only read your purchase history. We can't see payment info or place orders.
            </Text>
          </View>
        </ScrollView>

        {/* Connect modal */}
        <Modal
          visible={showConnectModal !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setShowConnectModal(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              {showConnectModal && (
                <>
                  <View style={styles.modalHeader}>
                    <View
                      style={[
                        styles.providerLogo,
                        { backgroundColor: getProviderInfo(showConnectModal).color + '20' },
                      ]}
                    >
                      <FontAwesome
                        name={getProviderInfo(showConnectModal).logo as any}
                        size={28}
                        color={getProviderInfo(showConnectModal).color}
                      />
                    </View>
                    <Text style={styles.modalTitle}>
                      Connect {getProviderInfo(showConnectModal).name}
                    </Text>
                  </View>
                  <Text style={styles.modalText}>
                    Sign in with the email tied to your loyalty account.
                  </Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="you@example.com"
                    placeholderTextColor="#999"
                    value={emailInput}
                    onChangeText={setEmailInput}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                  <View style={styles.modalActions}>
                    <TouchableOpacity
                      style={styles.modalCancel}
                      onPress={() => {
                        setShowConnectModal(null);
                        setEmailInput('');
                      }}
                    >
                      <Text style={styles.modalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.modalConnect,
                        { backgroundColor: getProviderInfo(showConnectModal).color },
                      ]}
                      onPress={handleConnect}
                      disabled={connecting !== null || !emailInput.trim()}
                    >
                      {connecting ? (
                        <ActivityIndicator color="#fff" />
                      ) : (
                        <Text style={styles.modalConnectText}>Connect</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16 },
  hero: { alignItems: 'center', paddingVertical: 24 },
  heroIcon: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  heroSubtitle: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 6, lineHeight: 18, maxWidth: 300 },
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: Colors.brand.primary },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2 },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a', marginBottom: 10 },
  accountCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  providerLogo: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  accountInfo: { flex: 1, marginLeft: 12 },
  accountName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  accountEmail: { fontSize: 12, color: '#666', marginTop: 1 },
  accountSync: { fontSize: 11, color: Colors.brand.primary, marginTop: 2, fontWeight: '500' },
  accountActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  syncButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  providerCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  providerInfo: { flex: 1, marginLeft: 12 },
  providerName: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  providerHint: { fontSize: 12, color: '#999' },
  purchaseCard: { backgroundColor: '#FAFAFA', borderRadius: 10, padding: 12, marginBottom: 8 },
  purchaseHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  purchaseStore: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  purchaseTotal: { fontSize: 14, fontWeight: '700', color: Colors.brand.primary },
  purchaseDate: { fontSize: 12, color: '#999' },
  purchaseItems: { fontSize: 12, color: '#666', marginTop: 6, lineHeight: 16 },
  privacyCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, marginTop: 8 },
  privacyText: { flex: 1, fontSize: 11, color: '#666', lineHeight: 16 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalHeader: { alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginTop: 8 },
  modalText: { fontSize: 13, color: '#666', textAlign: 'center', marginBottom: 16 },
  modalInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 14, fontSize: 15, color: '#1a1a1a', backgroundColor: '#FAFAFA', marginBottom: 16 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalCancel: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#666' },
  modalConnect: { flex: 1, paddingVertical: 14, borderRadius: 10, alignItems: 'center' },
  modalConnectText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
