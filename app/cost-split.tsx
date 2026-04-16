import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Platform,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';

interface Member {
  id: string;
  name: string;
  avatar_color: string;
}

interface Expense {
  id: string;
  description: string;
  amount: number;
  paid_by: string; // member id
  date: string;
  store: string;
  split_with: string[]; // member ids
}

const DEMO_MEMBERS: Member[] = [
  { id: 'me', name: 'You', avatar_color: '#2E7D32' },
  { id: 'alex', name: 'Alex', avatar_color: '#1976D2' },
  { id: 'sam', name: 'Sam', avatar_color: '#7C4DFF' },
];

const DEMO_EXPENSES: Expense[] = [
  { id: '1', description: 'Weekly groceries', amount: 87.43, paid_by: 'me', date: '2026-04-14', store: 'Trader Joe\'s', split_with: ['me', 'alex', 'sam'] },
  { id: '2', description: 'Pizza ingredients', amount: 24.50, paid_by: 'alex', date: '2026-04-12', store: 'Whole Foods', split_with: ['me', 'alex'] },
  { id: '3', description: 'Costco run', amount: 156.20, paid_by: 'sam', date: '2026-04-10', store: 'Costco', split_with: ['me', 'alex', 'sam'] },
  { id: '4', description: 'Snacks for game night', amount: 31.85, paid_by: 'me', date: '2026-04-08', store: 'Target', split_with: ['me', 'alex', 'sam'] },
];

export default function CostSplitScreen() {
  const [expenses, setExpenses] = useState<Expense[]>(DEMO_EXPENSES);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newStore, setNewStore] = useState('');
  const members = DEMO_MEMBERS;

  const handleAddExpense = () => {
    const amount = parseFloat(newAmount);
    if (!newDesc.trim() || !amount || isNaN(amount) || amount <= 0) {
      Alert.alert('Missing info', 'Enter a description and valid amount');
      return;
    }
    const newExp: Expense = {
      id: `e${Date.now()}`,
      description: newDesc.trim(),
      amount,
      paid_by: 'me',
      date: new Date().toISOString().split('T')[0],
      store: newStore.trim() || 'Unknown',
      split_with: ['me', 'alex', 'sam'],
    };
    setExpenses([newExp, ...expenses]);
    setNewDesc('');
    setNewAmount('');
    setNewStore('');
    setShowAddModal(false);
  };

  // Calculate balances - who owes who
  const balances = useMemo(() => {
    // For each expense, calculate share per person and net balance
    const totals: Record<string, number> = {};
    members.forEach((m) => (totals[m.id] = 0));

    for (const exp of expenses) {
      const share = exp.amount / exp.split_with.length;
      // Person who paid is owed the full amount minus their share
      totals[exp.paid_by] += exp.amount - share;
      // Each other person owes their share
      for (const memberId of exp.split_with) {
        if (memberId !== exp.paid_by) {
          totals[memberId] -= share;
        }
      }
    }
    return totals;
  }, [expenses]);

  // Calculate who owes whom (settlement)
  const settlements = useMemo(() => {
    const owes: { from: string; to: string; amount: number }[] = [];
    const positives = Object.entries(balances)
      .filter(([, v]) => v > 0.01)
      .sort((a, b) => b[1] - a[1]);
    const negatives = Object.entries(balances)
      .filter(([, v]) => v < -0.01)
      .sort((a, b) => a[1] - b[1]);

    let pi = 0, ni = 0;
    const positivesCopy = positives.map((p) => [...p] as [string, number]);
    const negativesCopy = negatives.map((n) => [...n] as [string, number]);

    while (pi < positivesCopy.length && ni < negativesCopy.length) {
      const [creditorId, creditorAmount] = positivesCopy[pi];
      const [debtorId, debtorAmount] = negativesCopy[ni];
      const transfer = Math.min(creditorAmount, -debtorAmount);
      owes.push({ from: debtorId, to: creditorId, amount: transfer });
      positivesCopy[pi][1] -= transfer;
      negativesCopy[ni][1] += transfer;
      if (positivesCopy[pi][1] < 0.01) pi++;
      if (negativesCopy[ni][1] > -0.01) ni++;
    }
    return owes;
  }, [balances, members]);

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);
  const myShare = expenses.reduce((sum, e) => {
    if (!e.split_with.includes('me')) return sum;
    return sum + e.amount / e.split_with.length;
  }, 0);

  const getMember = (id: string) => members.find((m) => m.id === id) || members[0];

  const sendVenmoRequest = (toName: string, amount: number) => {
    const note = `FreshScan groceries split`;
    const venmoUrl = Platform.select({
      ios: `venmo://paycharge?txn=charge&recipients=${encodeURIComponent(toName)}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`,
      android: `venmo://paycharge?txn=charge&recipients=${encodeURIComponent(toName)}&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`,
      default: `https://venmo.com/${encodeURIComponent(toName)}?txn=charge&amount=${amount.toFixed(2)}&note=${encodeURIComponent(note)}`,
    }) as string;

    Linking.canOpenURL(venmoUrl).then((supported) => {
      if (supported) {
        Linking.openURL(venmoUrl);
      } else {
        Alert.alert('Venmo', `Open Venmo and request $${amount.toFixed(2)} from ${toName} for groceries.`);
      }
    });
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Cost Splitting', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Summary */}
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>This Month</Text>
            <View style={styles.summaryRow}>
              <View style={styles.summaryStat}>
                <Text style={styles.summaryValue}>${totalSpent.toFixed(2)}</Text>
                <Text style={styles.summarySubLabel}>Total spent</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryStat}>
                <Text style={[styles.summaryValue, { color: Colors.brand.primary }]}>
                  ${myShare.toFixed(2)}
                </Text>
                <Text style={styles.summarySubLabel}>Your share</Text>
              </View>
            </View>
          </View>

          {/* Settlement / who owes whom */}
          {settlements.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Settle Up</Text>
              <Text style={styles.sectionSubtitle}>Tap to send a Venmo request</Text>
              {settlements.map((s, idx) => {
                const from = getMember(s.from);
                const to = getMember(s.to);
                const isMineSent = s.from === 'me';
                const isMineReceived = s.to === 'me';
                return (
                  <TouchableOpacity
                    key={idx}
                    style={styles.settlementCard}
                    onPress={() => {
                      if (isMineSent) {
                        Alert.alert('You Owe', `You owe ${to.name} $${s.amount.toFixed(2)}. Open Venmo to pay?`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Open Venmo', onPress: () => sendVenmoRequest(to.name, s.amount) },
                        ]);
                      } else if (isMineReceived) {
                        sendVenmoRequest(from.name, s.amount);
                      }
                    }}
                  >
                    <View style={[styles.avatar, { backgroundColor: from.avatar_color }]}>
                      <Text style={styles.avatarText}>{from.name[0]}</Text>
                    </View>
                    <View style={styles.settlementInfo}>
                      <Text style={styles.settlementText}>
                        <Text style={styles.settlementName}>{from.name}</Text>
                        <Text style={styles.settlementOwe}> owes </Text>
                        <Text style={styles.settlementName}>{to.name}</Text>
                      </Text>
                      <Text style={styles.settlementAmount}>${s.amount.toFixed(2)}</Text>
                    </View>
                    <View style={[styles.avatar, { backgroundColor: to.avatar_color }]}>
                      <Text style={styles.avatarText}>{to.name[0]}</Text>
                    </View>
                    {(isMineSent || isMineReceived) && (
                      <View style={styles.venmoTag}>
                        <Text style={styles.venmoText}>Venmo</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Per-member balance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Member Balances</Text>
            {members.map((m) => {
              const bal = balances[m.id];
              return (
                <View key={m.id} style={styles.balanceRow}>
                  <View style={[styles.avatar, { backgroundColor: m.avatar_color }]}>
                    <Text style={styles.avatarText}>{m.name[0]}</Text>
                  </View>
                  <Text style={styles.balanceName}>{m.name}</Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      { color: bal > 0 ? Colors.brand.primary : bal < 0 ? '#D32F2F' : '#999' },
                    ]}
                  >
                    {bal > 0.01 ? '+' : ''}${bal.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Recent expenses */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            {expenses.map((e) => {
              const payer = getMember(e.paid_by);
              return (
                <View key={e.id} style={styles.expenseCard}>
                  <View style={[styles.avatar, { backgroundColor: payer.avatar_color, width: 32, height: 32 }]}>
                    <Text style={[styles.avatarText, { fontSize: 12 }]}>{payer.name[0]}</Text>
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseDesc}>{e.description}</Text>
                    <Text style={styles.expenseMeta}>
                      {payer.name} paid - {e.store} - {e.date}
                    </Text>
                    <Text style={styles.expenseSplit}>
                      Split {e.split_with.length} ways: ${(e.amount / e.split_with.length).toFixed(2)}/person
                    </Text>
                  </View>
                  <Text style={styles.expenseAmount}>${e.amount.toFixed(2)}</Text>
                </View>
              );
            })}
          </View>

          {/* Add expense */}
          <TouchableOpacity
            style={styles.addExpenseButton}
            onPress={() => setShowAddModal(true)}
          >
            <FontAwesome name="plus" size={14} color="#fff" />
            <Text style={styles.addExpenseText}>Add Expense</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Add expense modal */}
        <Modal
          visible={showAddModal}
          transparent
          animationType="slide"
          onRequestClose={() => setShowAddModal(false)}
        >
          <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              <Text style={styles.modalTitle}>Add Expense</Text>
              <Text style={styles.modalLabel}>Description</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Weekly groceries"
                placeholderTextColor="#999"
                value={newDesc}
                onChangeText={setNewDesc}
              />
              <Text style={styles.modalLabel}>Amount ($)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="45.00"
                placeholderTextColor="#999"
                value={newAmount}
                onChangeText={setNewAmount}
                keyboardType="decimal-pad"
              />
              <Text style={styles.modalLabel}>Store (optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="Trader Joe's"
                placeholderTextColor="#999"
                value={newStore}
                onChangeText={setNewStore}
              />
              <Text style={styles.modalHint}>
                Split evenly across all household members. Editing who to split with coming v1.1.
              </Text>
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={() => setShowAddModal(false)}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalSubmit} onPress={handleAddExpense}>
                  <Text style={styles.modalSubmitText}>Add Expense</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16 },
  summaryCard: { backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12 },
  summaryLabel: { fontSize: 12, color: '#999', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  summaryStat: { flex: 1, alignItems: 'center' },
  summaryValue: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  summarySubLabel: { fontSize: 11, color: '#999', marginTop: 4 },
  summaryDivider: { width: 1, height: 50, backgroundColor: '#E0E0E0' },
  section: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 12 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  sectionSubtitle: { fontSize: 11, color: '#999', marginTop: 2, marginBottom: 10 },
  settlementCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  settlementInfo: { flex: 1 },
  settlementText: { fontSize: 13, color: '#1a1a1a' },
  settlementName: { fontWeight: '700' },
  settlementOwe: { color: '#999' },
  settlementAmount: { fontSize: 16, fontWeight: '700', color: Colors.brand.primary, marginTop: 2 },
  venmoTag: { position: 'absolute', top: 8, right: 0, backgroundColor: '#3D95CE', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  venmoText: { color: '#fff', fontSize: 9, fontWeight: '700' },
  balanceRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
  balanceName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  balanceAmount: { fontSize: 15, fontWeight: '700' },
  expenseCard: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  expenseInfo: { flex: 1 },
  expenseDesc: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  expenseMeta: { fontSize: 11, color: '#999', marginTop: 1 },
  expenseSplit: { fontSize: 11, color: Colors.brand.primary, marginTop: 2 },
  expenseAmount: { fontSize: 14, fontWeight: '700', color: '#1a1a1a' },
  addExpenseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.brand.primary, borderRadius: 12, padding: 14, marginTop: 4 },
  addExpenseText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 32 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1a1a1a', marginBottom: 16 },
  modalLabel: { fontSize: 12, fontWeight: '600', color: '#666', marginBottom: 6, marginTop: 10 },
  modalInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 10, padding: 12, fontSize: 15, color: '#1a1a1a', backgroundColor: '#FAFAFA' },
  modalHint: { fontSize: 11, color: '#999', marginTop: 10, lineHeight: 16, fontStyle: 'italic' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalCancel: { paddingVertical: 14, paddingHorizontal: 24, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#666' },
  modalSubmit: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: Colors.brand.primary, alignItems: 'center' },
  modalSubmitText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
