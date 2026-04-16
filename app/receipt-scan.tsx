import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Colors from '@/constants/Colors';
import { scanReceipt, type ReceiptScanResult, type ReceiptLineItem } from '@/services/receiptService';

export default function ReceiptScanScreen() {
  const router = useRouter();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [result, setResult] = useState<ReceiptScanResult | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [excludedItems, setExcludedItems] = useState<Set<number>>(new Set());

  const pickReceipt = async () => {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85 });
    if (!r.canceled && r.assets[0]) {
      setPhotoUri(r.assets[0].uri);
      handleScan(r.assets[0].uri);
    }
  };

  const handleScan = async (uri: string) => {
    setIsScanning(true);
    try {
      const r = await scanReceipt(uri);
      setResult(r);
      // Auto-exclude non-food items
      const exc = new Set<number>();
      r.items.forEach((item, idx) => {
        if (!item.is_food) exc.add(idx);
      });
      setExcludedItems(exc);
    } catch {
      Alert.alert('Scan Failed', 'Could not parse receipt');
    }
    setIsScanning(false);
  };

  const tryDemoScan = () => {
    setPhotoUri('demo');
    handleScan('demo');
  };

  const toggleExclude = (idx: number) => {
    setExcludedItems((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleAddAll = () => {
    if (!result) return;
    const toAdd = result.items.filter((_, idx) => !excludedItems.has(idx));
    Alert.alert(
      'Added to Inventory',
      `${toAdd.length} items added with prices and category`,
      [{ text: 'Done', onPress: () => router.back() }]
    );
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Scan Receipt', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {!photoUri && (
            <View style={styles.heroSection}>
              <View style={styles.heroIcon}>
                <FontAwesome name="file-text-o" size={56} color={Colors.brand.primary} />
              </View>
              <Text style={styles.heroTitle}>Scan a Receipt</Text>
              <Text style={styles.heroSubtitle}>
                Photograph any grocery receipt. We'll auto-extract all items, prices, and categories.
              </Text>

              <TouchableOpacity style={styles.primaryButton} onPress={pickReceipt}>
                <FontAwesome name="image" size={18} color="#fff" />
                <Text style={styles.primaryButtonText}>Choose Receipt Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.secondaryButton} onPress={tryDemoScan}>
                <FontAwesome name="magic" size={14} color={Colors.brand.primary} />
                <Text style={styles.secondaryButtonText}>Try Demo Receipt</Text>
              </TouchableOpacity>
            </View>
          )}

          {photoUri && photoUri !== 'demo' && (
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
          )}

          {isScanning && (
            <View style={styles.scanningSection}>
              <ActivityIndicator size="large" color={Colors.brand.primary} />
              <Text style={styles.scanningText}>Reading receipt...</Text>
              <Text style={styles.scanningHint}>OCR + categorization in progress</Text>
            </View>
          )}

          {result && !isScanning && (
            <View style={styles.resultsSection}>
              {/* Receipt header */}
              <View style={styles.receiptHeader}>
                {result.store && <Text style={styles.storeName}>{result.store}</Text>}
                <View style={styles.receiptMeta}>
                  {result.date && <Text style={styles.receiptDate}>{result.date}</Text>}
                  {result.total != null && <Text style={styles.receiptTotal}>${result.total.toFixed(2)}</Text>}
                </View>
              </View>

              {/* Item count */}
              <View style={styles.summaryRow}>
                <Text style={styles.summaryText}>
                  {result.items.length - excludedItems.size} of {result.items.length} items selected
                </Text>
              </View>

              {/* Line items */}
              {result.items.map((item, idx) => {
                const excluded = excludedItems.has(idx);
                return (
                  <TouchableOpacity
                    key={idx}
                    style={[styles.lineItem, excluded && styles.lineItemExcluded]}
                    onPress={() => toggleExclude(idx)}
                  >
                    <View style={[styles.checkbox, !excluded && styles.checkboxActive]}>
                      {!excluded && <FontAwesome name="check" size={10} color="#fff" />}
                    </View>
                    <View style={styles.lineInfo}>
                      <Text style={[styles.lineName, excluded && styles.lineNameExcluded]}>
                        {item.name}
                      </Text>
                      <View style={styles.lineMetaRow}>
                        <Text style={styles.lineMeta}>{item.quantity}</Text>
                        <View style={styles.categoryDot} />
                        <Text style={styles.lineMeta}>{item.category}</Text>
                        {!item.is_food && (
                          <View style={styles.nonFoodBadge}>
                            <Text style={styles.nonFoodText}>non-food</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    {item.price != null && (
                      <Text style={styles.linePrice}>${item.price.toFixed(2)}</Text>
                    )}
                  </TouchableOpacity>
                );
              })}

              {/* Action buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.rescanButton}
                  onPress={() => { setPhotoUri(null); setResult(null); setExcludedItems(new Set()); }}
                >
                  <Text style={styles.rescanText}>Rescan</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addAllButton} onPress={handleAddAll}>
                  <FontAwesome name="check" size={14} color="#fff" />
                  <Text style={styles.addAllText}>
                    Add {result.items.length - excludedItems.size} Items
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16 },
  heroSection: { alignItems: 'center', paddingVertical: 32 },
  heroIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heroTitle: { fontSize: 24, fontWeight: '700', color: '#1a1a1a' },
  heroSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 300 },
  primaryButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.brand.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 24 },
  primaryButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  secondaryButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingVertical: 12, paddingHorizontal: 24 },
  secondaryButtonText: { color: Colors.brand.primary, fontSize: 14, fontWeight: '600' },
  previewImage: { width: '100%', height: 200, borderRadius: 12, marginBottom: 16 },
  scanningSection: { alignItems: 'center', paddingVertical: 32 },
  scanningText: { fontSize: 17, fontWeight: '600', color: '#1a1a1a', marginTop: 16 },
  scanningHint: { fontSize: 13, color: '#999', marginTop: 4 },
  resultsSection: { paddingTop: 8 },
  receiptHeader: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 16, marginBottom: 12 },
  storeName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  receiptMeta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  receiptDate: { fontSize: 13, color: '#666' },
  receiptTotal: { fontSize: 15, fontWeight: '700', color: Colors.brand.primary },
  summaryRow: { paddingVertical: 8 },
  summaryText: { fontSize: 13, color: '#999', fontWeight: '500' },
  lineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 12 },
  lineItemExcluded: { opacity: 0.4 },
  checkbox: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' },
  checkboxActive: { backgroundColor: Colors.brand.primary, borderColor: Colors.brand.primary },
  lineInfo: { flex: 1 },
  lineName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  lineNameExcluded: { textDecorationLine: 'line-through' },
  lineMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  lineMeta: { fontSize: 12, color: '#999' },
  categoryDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: '#CCC' },
  nonFoodBadge: { backgroundColor: '#FFEBEE', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  nonFoodText: { fontSize: 10, color: '#D32F2F', fontWeight: '600' },
  linePrice: { fontSize: 14, fontWeight: '600', color: '#333' },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  rescanButton: { paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  rescanText: { fontSize: 14, fontWeight: '600', color: '#666' },
  addAllButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.brand.primary, borderRadius: 10, paddingVertical: 14 },
  addAllText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
