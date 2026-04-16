import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useInventoryStore } from '@/stores/inventoryStore';
import {
  getStorageTip,
  detectEthyleneConflicts,
  getAllStorageTips,
  type StorageTip,
} from '@/services/storageAdvisor';
import { formatStorageLocation } from '@/lib/helpers';

export default function StorageAdvisorScreen() {
  const items = useInventoryStore((s) => s.items);
  const [searchText, setSearchText] = useState('');

  // Detect ethylene conflicts in current inventory
  const conflicts = useMemo(
    () =>
      detectEthyleneConflicts(
        items.map((i) => ({
          name: i.ingredient?.name || '',
          location: formatStorageLocation(i.storage_location),
        }))
      ),
    [items]
  );

  // Tips for current items
  const itemTips = useMemo(() => {
    const tips: { item: string; tip: StorageTip }[] = [];
    const seen = new Set<string>();
    for (const i of items) {
      const name = i.ingredient?.name || '';
      const tip = getStorageTip(name);
      if (tip && !seen.has(tip.ingredient)) {
        seen.add(tip.ingredient);
        tips.push({ item: name, tip });
      }
    }
    return tips;
  }, [items]);

  // Search across full database
  const searchResults = useMemo(() => {
    if (!searchText.trim()) return [];
    const lower = searchText.toLowerCase();
    return getAllStorageTips().filter(
      (t) =>
        t.ingredient.toLowerCase().includes(lower) ||
        t.optimal_location.toLowerCase().includes(lower)
    );
  }, [searchText]);

  return (
    <>
      <Stack.Screen options={{ title: 'Storage Advisor', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Search */}
          <View style={styles.searchBar}>
            <FontAwesome name="search" size={14} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search any ingredient..."
              placeholderTextColor="#999"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>

          {/* Search results */}
          {searchText.trim() && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search Results</Text>
              {searchResults.map((tip) => (
                <TipCard key={tip.ingredient} tip={tip} />
              ))}
              {searchResults.length === 0 && (
                <Text style={styles.emptyText}>No matches in our database yet.</Text>
              )}
            </View>
          )}

          {/* Ethylene conflicts */}
          {!searchText && conflicts.length > 0 && (
            <View style={styles.warningSection}>
              <View style={styles.warningHeader}>
                <FontAwesome name="exclamation-triangle" size={16} color="#FF6D00" />
                <Text style={styles.warningTitle}>
                  {conflicts.length} Ethylene Conflict{conflicts.length !== 1 ? 's' : ''} Detected
                </Text>
              </View>
              {conflicts.slice(0, 5).map((c, idx) => (
                <View key={idx} style={styles.conflictCard}>
                  <View style={styles.conflictPair}>
                    <View style={styles.conflictBadge}>
                      <FontAwesome name="leaf" size={10} color="#FF6D00" />
                      <Text style={styles.conflictBadgeText}>Producer</Text>
                    </View>
                    <Text style={styles.conflictName}>{c.producer}</Text>
                    <FontAwesome name="arrow-right" size={10} color="#999" />
                    <View style={[styles.conflictBadge, { backgroundColor: '#FFEBEE' }]}>
                      <FontAwesome name="warning" size={10} color="#D32F2F" />
                      <Text style={[styles.conflictBadgeText, { color: '#D32F2F' }]}>Sensitive</Text>
                    </View>
                    <Text style={styles.conflictName}>{c.sensitive}</Text>
                  </View>
                  <Text style={styles.conflictMessage}>{c.message}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tips for current inventory */}
          {!searchText && itemTips.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Tips for Your Inventory</Text>
              <Text style={styles.sectionSubtitle}>Based on what's in your fridge right now</Text>
              {itemTips.map((t) => (
                <TipCard key={t.tip.ingredient} tip={t.tip} />
              ))}
            </View>
          )}

          {/* Browse all */}
          {!searchText && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Browse Storage Tips</Text>
              <Text style={styles.sectionSubtitle}>Tap any item for detailed tips</Text>
              <View style={styles.chipGrid}>
                {getAllStorageTips().map((t) => (
                  <TouchableOpacity
                    key={t.ingredient}
                    style={styles.chip}
                    onPress={() => setSearchText(t.ingredient)}
                  >
                    <Text style={styles.chipText}>{t.ingredient}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

function TipCard({ tip }: { tip: StorageTip }) {
  return (
    <View style={styles.tipCard}>
      <View style={styles.tipHeader}>
        <Text style={styles.tipName}>{tip.ingredient}</Text>
        <View style={styles.tipBadges}>
          {tip.ethylene_producer && (
            <View style={[styles.tinyBadge, { backgroundColor: '#FFF3E0' }]}>
              <Text style={[styles.tinyBadgeText, { color: '#FF6D00' }]}>Producer</Text>
            </View>
          )}
          {tip.ethylene_sensitive && (
            <View style={[styles.tinyBadge, { backgroundColor: '#FFEBEE' }]}>
              <Text style={[styles.tinyBadgeText, { color: '#D32F2F' }]}>Sensitive</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.tipRow}>
        <FontAwesome name="map-marker" size={12} color={Colors.brand.primary} style={styles.tipIcon} />
        <Text style={styles.tipText}>{tip.optimal_location}</Text>
      </View>
      <View style={styles.tipRow}>
        <FontAwesome name="clock-o" size={12} color={Colors.brand.primary} style={styles.tipIcon} />
        <Text style={styles.tipText}>{tip.shelf_life_note}</Text>
      </View>
      <View style={styles.tipRow}>
        <FontAwesome name="lightbulb-o" size={12} color="#FFC107" style={styles.tipIcon} />
        <Text style={styles.tipText}>{tip.prep_tip}</Text>
      </View>

      {tip.warnings.map((w, idx) => (
        <View key={idx} style={styles.warningRow}>
          <FontAwesome name="exclamation-circle" size={12} color="#D32F2F" style={styles.tipIcon} />
          <Text style={styles.warningText}>{w}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  scrollContent: { padding: 16 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, height: 44, gap: 10, marginBottom: 16 },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  sectionSubtitle: { fontSize: 12, color: '#999', marginTop: 2, marginBottom: 12 },
  warningSection: { backgroundColor: '#FFF8E1', borderRadius: 14, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#FFE082' },
  warningHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  warningTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  conflictCard: { backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 },
  conflictPair: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  conflictBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFF3E0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  conflictBadgeText: { fontSize: 10, fontWeight: '700', color: '#FF6D00' },
  conflictName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  conflictMessage: { fontSize: 12, color: '#666', marginTop: 8, lineHeight: 16 },
  tipCard: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 8 },
  tipHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  tipName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  tipBadges: { flexDirection: 'row', gap: 6 },
  tinyBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  tinyBadgeText: { fontSize: 10, fontWeight: '700' },
  tipRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4, gap: 8 },
  tipIcon: { width: 14, marginTop: 2 },
  tipText: { flex: 1, fontSize: 13, color: '#333', lineHeight: 18 },
  warningRow: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#FFEBEE', borderRadius: 8, padding: 8, marginTop: 6, gap: 8 },
  warningText: { flex: 1, fontSize: 12, color: '#D32F2F', lineHeight: 16 },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#fff' },
  chipText: { fontSize: 12, fontWeight: '500', color: '#333' },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', padding: 16 },
});
