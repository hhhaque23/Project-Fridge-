import React, { useEffect, useState } from 'react';
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
import Colors from '@/constants/Colors';
import { useGroceryStore } from '@/stores/groceryStore';
import { useAuthStore } from '@/stores/authStore';
import type { GroceryListItem } from '@/lib/types';

export default function GroceryScreen() {
  const [newItemText, setNewItemText] = useState('');
  const { items, isLoading, fetchItems, addItem, togglePurchased, removeItem, clearPurchased } = useGroceryStore();
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (user?.household_id) fetchItems(user.household_id);
  }, [user?.household_id]);

  const unpurchased = items.filter((i) => !i.is_purchased);
  const purchased = items.filter((i) => i.is_purchased);

  const handleAddItem = async () => {
    if (!newItemText.trim() || !user?.household_id) return;
    await addItem({
      household_id: user.household_id,
      ingredient_id: '', // Would resolve via autocomplete in production
      quantity_text: newItemText.trim(),
      source: 'manual',
      added_by: user.id,
      is_purchased: false,
    });
    setNewItemText('');
  };

  const handleClearPurchased = () => {
    if (!user?.household_id || purchased.length === 0) return;
    Alert.alert(
      'Clear Purchased',
      `Remove ${purchased.length} purchased items?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => clearPurchased(user.household_id!) },
      ]
    );
  };

  const handleSwipeDelete = (id: string) => {
    Alert.alert('Remove Item', 'Remove from grocery list?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeItem(id) },
    ]);
  };

  const renderItem = ({ item }: { item: GroceryListItem }) => (
    <TouchableOpacity
      style={[styles.itemCard, item.is_purchased && styles.itemPurchased]}
      onPress={() => togglePurchased(item.id)}
      onLongPress={() => handleSwipeDelete(item.id)}
    >
      <View style={[styles.checkbox, item.is_purchased && styles.checkboxChecked]}>
        {item.is_purchased && <FontAwesome name="check" size={12} color="#fff" />}
      </View>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemName, item.is_purchased && styles.itemNameChecked]}>
          {item.ingredient?.name || item.quantity_text}
        </Text>
        <Text style={styles.itemQuantity}>{item.quantity_text}</Text>
      </View>
      <View style={styles.itemRight}>
        {item.source === 'recipe' && (
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>Recipe</Text>
          </View>
        )}
        {item.source === 'staple_restock' && (
          <View style={[styles.sourceBadge, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.sourceBadgeText, { color: '#FF6D00' }]}>Staple</Text>
          </View>
        )}
        {item.estimated_price != null && (
          <Text style={styles.priceText}>${item.estimated_price.toFixed(2)}</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Add item bar */}
      <View style={styles.addBar}>
        <TextInput
          style={styles.addInput}
          placeholder="Add item..."
          placeholderTextColor="#999"
          value={newItemText}
          onChangeText={setNewItemText}
          onSubmitEditing={handleAddItem}
          returnKeyType="done"
        />
        <TouchableOpacity
          style={[styles.addButton, !newItemText.trim() && styles.addButtonDisabled]}
          onPress={handleAddItem}
          disabled={!newItemText.trim()}
        >
          <FontAwesome name="plus" size={16} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary bar */}
      <View style={styles.summaryBar}>
        <Text style={styles.summaryText}>
          {unpurchased.length} items remaining
        </Text>
        {purchased.length > 0 && (
          <TouchableOpacity onPress={handleClearPurchased}>
            <Text style={styles.clearText}>Clear {purchased.length} done</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Items list */}
      <FlatList
        data={[...unpurchased, ...purchased]}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FontAwesome name="shopping-cart" size={48} color="#ccc" />
            <Text style={styles.emptyTitle}>List is empty</Text>
            <Text style={styles.emptyText}>
              Add items manually or generate from recipes
            </Text>
          </View>
        }
        ItemSeparatorComponent={() => {
          // Show separator between unpurchased and purchased
          return null;
        }}
      />

      {unpurchased.length > 0 && purchased.length > 0 && (
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>Purchased</Text>
          <View style={styles.dividerLine} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  addBar: { flexDirection: 'row', padding: 16, paddingBottom: 8, gap: 10 },
  addInput: { flex: 1, height: 44, backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 16, fontSize: 15, color: '#1a1a1a' },
  addButton: { width: 44, height: 44, borderRadius: 12, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  addButtonDisabled: { opacity: 0.4 },
  summaryBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  summaryText: { fontSize: 13, color: '#999', fontWeight: '500' },
  clearText: { fontSize: 13, color: Colors.brand.primary, fontWeight: '600' },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  itemCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' },
  itemPurchased: { opacity: 0.5 },
  checkbox: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  itemNameChecked: { textDecorationLine: 'line-through', color: '#999' },
  itemQuantity: { fontSize: 13, color: '#999', marginTop: 1 },
  itemRight: { alignItems: 'flex-end', gap: 4 },
  sourceBadge: { backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  sourceBadgeText: { fontSize: 10, fontWeight: '600', color: Colors.brand.primary },
  priceText: { fontSize: 12, color: '#999' },
  divider: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#E0E0E0' },
  dividerText: { paddingHorizontal: 12, fontSize: 12, color: '#999' },
  emptyState: { alignItems: 'center', paddingVertical: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptyText: { fontSize: 14, color: '#ccc', marginTop: 4, textAlign: 'center' },
});
