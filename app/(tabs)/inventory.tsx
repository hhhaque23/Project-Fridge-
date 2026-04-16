import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TextInput,
  Alert,
} from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import Colors, { ExpiryColors } from '@/constants/Colors';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useAuthStore } from '@/stores/authStore';
import {
  getExpiryStatus,
  getExpiryColor,
  getExpiryLabel,
  getFreshnessPercent,
  formatStorageLocation,
} from '@/lib/helpers';
import type { InventoryItem, StorageLocation } from '@/lib/types';

const LOCATION_TABS: { key: StorageLocation | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'fridge_top', label: 'Fridge' },
  { key: 'freezer', label: 'Freezer' },
  { key: 'pantry', label: 'Pantry' },
  { key: 'countertop', label: 'Counter' },
];

export default function InventoryScreen() {
  const [searchText, setSearchText] = useState('');
  const { items, isLoading, filter, setFilter, fetchItems, markAsOpened, freezeToSave, markConsumed, markWasted } = useInventoryStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user?.household_id) fetchItems(user.household_id);
  }, [user?.household_id]);

  const filteredItems = items.filter((item) => {
    if (filter.location !== 'all') {
      if (filter.location === 'fridge_top') {
        if (!item.storage_location.startsWith('fridge') && item.storage_location !== 'crisper') return false;
      } else if (item.storage_location !== filter.location) return false;
    }
    if (searchText) {
      return item.ingredient?.name.toLowerCase().includes(searchText.toLowerCase());
    }
    return true;
  });

  const handleItemAction = (item: InventoryItem) => {
    const actions: any[] = [
      { text: 'Cancel', style: 'cancel' },
    ];

    if (!item.is_opened) {
      actions.push({
        text: 'Mark as Opened',
        onPress: () => markAsOpened(item.id),
      });
    }

    const status = getExpiryStatus(item.expiry_date);
    if (status === 'expiring_soon' || status === 'expiring_today') {
      actions.push({
        text: 'Freeze to Save',
        onPress: () => freezeToSave(item.id),
      });
    }

    actions.push({
      text: 'Mark as Used',
      onPress: () => markConsumed(item.id),
    });

    actions.push({
      text: 'Mark as Wasted',
      style: 'destructive',
      onPress: () => {
        Alert.alert('Reason', 'Why was this item wasted?', [
          { text: 'Expired', onPress: () => markWasted(item.id, 'expired') },
          { text: 'Spoiled', onPress: () => markWasted(item.id, 'spoiled') },
          { text: 'Forgot about it', onPress: () => markWasted(item.id, 'leftover_forgotten') },
          { text: 'Cancel', style: 'cancel' },
        ]);
      },
    });

    Alert.alert(item.ingredient?.name || 'Item', getExpiryLabel(item.expiry_date), actions);
  };

  const renderItem = ({ item }: { item: InventoryItem }) => {
    const status = getExpiryStatus(item.expiry_date);
    const color = getExpiryColor(status);
    const freshness = getFreshnessPercent(item.expiry_date, item.original_expiry_date);

    return (
      <TouchableOpacity style={styles.itemCard} onPress={() => handleItemAction(item)}>
        <View style={[styles.freshnessBar, { backgroundColor: color, width: `${freshness}%` }]} />
        <View style={styles.itemContent}>
          <View style={styles.itemLeft}>
            <Text style={styles.itemName}>{item.ingredient?.name || 'Unknown'}</Text>
            <Text style={styles.itemMeta}>
              {item.quantity_text} &middot; {formatStorageLocation(item.storage_location)}
              {item.is_opened ? ' &middot; Opened' : ''}
            </Text>
          </View>
          <View style={styles.itemRight}>
            <Text style={[styles.expiryText, { color }]}>{getExpiryLabel(item.expiry_date)}</Text>
            {status === 'expiring_soon' || status === 'expiring_today' ? (
              <TouchableOpacity
                style={styles.freezeButton}
                onPress={(e) => {
                  e.stopPropagation?.();
                  freezeToSave(item.id);
                }}
              >
                <FontAwesome name="snowflake-o" size={12} color={ExpiryColors.frozen} />
                <Text style={styles.freezeText}>Freeze</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <FontAwesome name="search" size={16} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          placeholderTextColor="#999"
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <FontAwesome name="times-circle" size={16} color="#999" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Location tabs */}
      <View style={styles.tabsContainer}>
        {LOCATION_TABS.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, filter.location === tab.key && styles.tabActive]}
            onPress={() => setFilter({ location: tab.key })}
          >
            <Text style={[styles.tabText, filter.location === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Stats bar */}
      <View style={styles.statsBar}>
        <Text style={styles.statsText}>
          {filteredItems.length} items
        </Text>
        <View style={styles.statsRight}>
          <View style={[styles.statDot, { backgroundColor: ExpiryColors.fresh }]} />
          <Text style={styles.statLabel}>
            {filteredItems.filter((i) => getExpiryStatus(i.expiry_date) === 'fresh').length} fresh
          </Text>
          <View style={[styles.statDot, { backgroundColor: ExpiryColors.expiringSoon }]} />
          <Text style={styles.statLabel}>
            {filteredItems.filter((i) => ['expiring_soon', 'expiring_today'].includes(getExpiryStatus(i.expiry_date))).length} expiring
          </Text>
        </View>
      </View>

      {/* Item list */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FontAwesome name="inbox" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>No items yet</Text>
            <Text style={styles.emptyText}>Scan your fridge to start tracking inventory</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, marginBottom: 8, backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 14, height: 44 },
  searchIcon: { marginRight: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 12, gap: 4, marginBottom: 8 },
  tab: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20, backgroundColor: '#F5F5F5' },
  tabActive: { backgroundColor: Colors.brand.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: '#666' },
  tabTextActive: { color: '#fff' },
  statsBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  statsText: { fontSize: 13, color: '#999', fontWeight: '500' },
  statsRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statDot: { width: 8, height: 8, borderRadius: 4 },
  statLabel: { fontSize: 12, color: '#999' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  itemCard: { backgroundColor: '#FAFAFA', borderRadius: 12, marginBottom: 8, overflow: 'hidden' },
  freshnessBar: { height: 3, borderRadius: 2 },
  itemContent: { flexDirection: 'row', padding: 14, alignItems: 'center' },
  itemLeft: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  itemMeta: { fontSize: 13, color: '#999', marginTop: 2 },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  expiryText: { fontSize: 13, fontWeight: '600' },
  freezeButton: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E3F2FD', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  freezeText: { fontSize: 11, color: ExpiryColors.frozen, fontWeight: '600' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#ccc', marginTop: 4 },
});
