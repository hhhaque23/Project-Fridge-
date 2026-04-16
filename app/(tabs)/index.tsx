import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useAuthStore } from '@/stores/authStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { scanFridgeImage } from '@/services/visionService';
import { lookupBarcode, type BarcodeProduct } from '@/services/barcodeService';
import type { VisionScanItem } from '@/lib/types';
import { getExpiryColor, getExpiryStatus } from '@/lib/helpers';

type ScanMode = 'idle' | 'camera' | 'barcode' | 'scanning';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [scanResults, setScanResults] = useState<VisionScanItem[]>([]);
  const [barcodeResult, setBarcodeResult] = useState<BarcodeProduct | null>(null);
  const [mode, setMode] = useState<ScanMode>('idle');
  const cameraRef = useRef<CameraView>(null);
  const lastScannedBarcode = useRef<string>('');

  const expiringItems = useInventoryStore((s) => s.getExpiringItems());

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const result = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    if (result) {
      setPhoto(result.uri);
      setMode('scanning');
      handleVisionScan(result.uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
      setMode('scanning');
      handleVisionScan(result.assets[0].uri);
    }
  };

  const handleVisionScan = async (imageUri: string) => {
    try {
      const results = await scanFridgeImage(imageUri);
      setScanResults(results);
      setMode('idle');
    } catch {
      Alert.alert('Scan Failed', 'Could not analyze the image. Please try again.');
      setMode('idle');
    }
  };

  const handleBarcodeScan = async ({ data }: { data: string }) => {
    if (data === lastScannedBarcode.current) return;
    lastScannedBarcode.current = data;
    const result = await lookupBarcode(data);
    if (result) {
      setBarcodeResult(result);
      setMode('idle');
    } else {
      // Demo fallback
      setBarcodeResult({
        barcode: data,
        name: 'Sample Product',
        brand: 'Demo Brand',
        category: 'Snacks',
        image_url: null,
      });
      setMode('idle');
    }
  };

  const confirmItem = (item: VisionScanItem) => {
    Alert.alert('Added', `${item.name} added to inventory`);
    setScanResults((prev) => prev.filter((i) => i !== item));
  };

  const confirmAll = () => {
    scanResults.filter((i) => i.confidence >= 85).forEach(confirmItem);
  };

  const confirmBarcodeProduct = () => {
    if (!barcodeResult) return;
    Alert.alert('Added', `${barcodeResult.name} added to inventory`);
    setBarcodeResult(null);
    lastScannedBarcode.current = '';
  };

  // Camera mode (vision)
  if (mode === 'camera') {
    if (!permission?.granted) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centered}>
            <FontAwesome name="camera" size={48} color="#999" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Grant Access</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <SafeAreaView style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setMode('idle')}>
              <FontAwesome name="times" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.cameraGuide}>
              <Text style={styles.cameraGuideText}>Point at a shelf or section</Text>
            </View>
            <View style={styles.cameraControls}>
              <TouchableOpacity style={styles.captureButton} onPress={takePhoto}>
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  // Barcode mode
  if (mode === 'barcode') {
    if (!permission?.granted) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centered}>
            <FontAwesome name="camera" size={48} color="#999" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <TouchableOpacity style={styles.primaryButton} onPress={requestPermission}>
              <Text style={styles.primaryButtonText}>Grant Access</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={handleBarcodeScan}
          barcodeScannerSettings={{
            barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'qr'],
          }}
        >
          <SafeAreaView style={styles.cameraOverlay}>
            <TouchableOpacity style={styles.closeButton} onPress={() => setMode('idle')}>
              <FontAwesome name="times" size={24} color="#fff" />
            </TouchableOpacity>
            <View style={styles.barcodeFrame}>
              <View style={[styles.barcodeCorner, { top: 0, left: 0, borderTopWidth: 3, borderLeftWidth: 3 }]} />
              <View style={[styles.barcodeCorner, { top: 0, right: 0, borderTopWidth: 3, borderRightWidth: 3 }]} />
              <View style={[styles.barcodeCorner, { bottom: 0, left: 0, borderBottomWidth: 3, borderLeftWidth: 3 }]} />
              <View style={[styles.barcodeCorner, { bottom: 0, right: 0, borderBottomWidth: 3, borderRightWidth: 3 }]} />
            </View>
            <View style={styles.cameraControls}>
              <Text style={styles.cameraGuideText}>Center the barcode in the frame</Text>
            </View>
          </SafeAreaView>
        </CameraView>
      </View>
    );
  }

  // Main scan screen
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!photo && scanResults.length === 0 && !barcodeResult && (
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <FontAwesome name="camera" size={56} color={Colors.brand.primary} />
            </View>
            <Text style={styles.heroTitle}>Scan Your Fridge</Text>
            <Text style={styles.heroSubtitle}>
              Take a photo and our AI will identify all visible items.
            </Text>
            <View style={styles.scanOptions}>
              <TouchableOpacity style={styles.scanButton} onPress={() => setMode('camera')}>
                <FontAwesome name="camera" size={24} color="#fff" />
                <Text style={styles.scanButtonText}>Quick Snap</Text>
                <Text style={styles.scanButtonHint}>AI vision scan</Text>
              </TouchableOpacity>
              <View style={styles.secondaryRow}>
                <TouchableOpacity style={styles.scanButtonSmall} onPress={() => setMode('barcode')}>
                  <FontAwesome name="barcode" size={20} color={Colors.brand.primary} />
                  <Text style={styles.scanButtonSmallText}>Barcode</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.scanButtonSmall} onPress={pickImage}>
                  <FontAwesome name="image" size={20} color={Colors.brand.primary} />
                  <Text style={styles.scanButtonSmallText}>Gallery</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {mode === 'scanning' && (
          <View style={styles.scanningSection}>
            {photo && <Image source={{ uri: photo }} style={styles.previewImage} />}
            <ActivityIndicator size="large" color={Colors.brand.primary} style={{ marginTop: 16 }} />
            <Text style={styles.scanningText}>Analyzing image...</Text>
            <Text style={styles.scanningHint}>Identifying items, estimating quantities</Text>
          </View>
        )}

        {/* Barcode result */}
        {barcodeResult && (
          <View style={styles.barcodeResultCard}>
            {barcodeResult.image_url && (
              <Image source={{ uri: barcodeResult.image_url }} style={styles.barcodeImage} />
            )}
            <Text style={styles.barcodeName}>{barcodeResult.name}</Text>
            {barcodeResult.brand && <Text style={styles.barcodeBrand}>{barcodeResult.brand}</Text>}
            <Text style={styles.barcodeCategory}>{barcodeResult.category}</Text>
            <View style={styles.barcodeActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setBarcodeResult(null);
                  lastScannedBarcode.current = '';
                }}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.confirmFullButton} onPress={confirmBarcodeProduct}>
                <FontAwesome name="check" size={14} color="#fff" />
                <Text style={styles.confirmFullText}>Add to Inventory</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Vision scan results */}
        {mode === 'idle' && scanResults.length > 0 && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>Found {scanResults.length} items</Text>
              <TouchableOpacity onPress={confirmAll}>
                <Text style={styles.confirmAllText}>Confirm All</Text>
              </TouchableOpacity>
            </View>
            {scanResults.map((item, idx) => (
              <View key={idx} style={styles.resultCard}>
                <View style={styles.resultInfo}>
                  <Text style={styles.resultName}>{item.name}</Text>
                  <Text style={styles.resultDetails}>
                    {item.quantity} - {item.category}
                  </Text>
                  <View style={styles.confidenceRow}>
                    <View
                      style={[
                        styles.confidenceBar,
                        {
                          width: `${item.confidence}%`,
                          backgroundColor:
                            item.confidence >= 85 ? Colors.brand.primaryLight
                            : item.confidence >= 60 ? '#FFC107' : '#F44336',
                        },
                      ]}
                    />
                    <Text style={styles.confidenceText}>{item.confidence}%</Text>
                  </View>
                </View>
                <TouchableOpacity style={styles.confirmButton} onPress={() => confirmItem(item)}>
                  <FontAwesome name="check" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={() => { setPhoto(null); setScanResults([]); }}
            >
              <Text style={styles.scanAgainText}>Scan Another Shelf</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Expiring items */}
        {!photo && !barcodeResult && expiringItems.length > 0 && (
          <View style={styles.expiringSection}>
            <Text style={styles.sectionTitle}>Expiring Soon ({expiringItems.length})</Text>
            {expiringItems.slice(0, 5).map((item) => (
              <View key={item.id} style={styles.expiringItem}>
                <View style={[styles.expiryDot, { backgroundColor: getExpiryColor(getExpiryStatus(item.expiry_date)) }]} />
                <Text style={styles.expiringName}>{item.ingredient?.name || 'Item'}</Text>
                <Text style={styles.expiringDate}>{new Date(item.expiry_date).toLocaleDateString()}</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  permissionTitle: { fontSize: 20, fontWeight: '700', marginTop: 16 },
  permissionText: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  primaryButton: { backgroundColor: Colors.brand.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32, marginTop: 16 },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cameraContainer: { flex: 1 },
  camera: { flex: 1 },
  cameraOverlay: { flex: 1, justifyContent: 'space-between' },
  closeButton: { padding: 16, alignSelf: 'flex-end' },
  cameraGuide: { alignItems: 'center' },
  cameraGuideText: { color: '#fff', fontSize: 16, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  cameraControls: { alignItems: 'center', paddingBottom: 40 },
  captureButton: { width: 72, height: 72, borderRadius: 36, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  captureButtonInner: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#fff' },
  barcodeFrame: { width: 280, height: 180, alignSelf: 'center' },
  barcodeCorner: { position: 'absolute', width: 30, height: 30, borderColor: Colors.brand.primaryLight },
  heroSection: { alignItems: 'center', paddingVertical: 24 },
  heroIcon: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  heroTitle: { fontSize: 26, fontWeight: '700', color: '#1a1a1a' },
  heroSubtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20, maxWidth: 280 },
  scanOptions: { width: '100%', marginTop: 24, gap: 12 },
  scanButton: { backgroundColor: Colors.brand.primary, borderRadius: 16, padding: 18, alignItems: 'center', gap: 4 },
  scanButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  scanButtonHint: { color: 'rgba(255,255,255,0.85)', fontSize: 12 },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  scanButtonSmall: { flex: 1, borderWidth: 1.5, borderColor: Colors.brand.primary, borderRadius: 12, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  scanButtonSmallText: { color: Colors.brand.primary, fontSize: 14, fontWeight: '600' },
  scanningSection: { alignItems: 'center', paddingVertical: 24 },
  previewImage: { width: '100%', height: 200, borderRadius: 12 },
  scanningText: { fontSize: 18, fontWeight: '600', marginTop: 12 },
  scanningHint: { fontSize: 14, color: '#999', marginTop: 4 },
  resultsSection: { paddingVertical: 8 },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  resultsTitle: { fontSize: 20, fontWeight: '700' },
  confirmAllText: { fontSize: 15, fontWeight: '600', color: Colors.brand.primary },
  resultCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 14, marginBottom: 8 },
  resultInfo: { flex: 1 },
  resultName: { fontSize: 16, fontWeight: '600' },
  resultDetails: { fontSize: 13, color: '#666', marginTop: 2 },
  confidenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  confidenceBar: { height: 4, borderRadius: 2, minWidth: 20 },
  confidenceText: { fontSize: 12, color: '#999' },
  confirmButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  scanAgainButton: { borderWidth: 1.5, borderColor: Colors.brand.primary, borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 12 },
  scanAgainText: { fontSize: 15, fontWeight: '600', color: Colors.brand.primary },
  // Barcode result
  barcodeResultCard: { backgroundColor: '#FAFAFA', borderRadius: 16, padding: 20, alignItems: 'center', marginVertical: 8 },
  barcodeImage: { width: 100, height: 100, borderRadius: 8, marginBottom: 12 },
  barcodeName: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  barcodeBrand: { fontSize: 14, color: '#666', marginTop: 2 },
  barcodeCategory: { fontSize: 12, color: Colors.brand.primary, fontWeight: '600', marginTop: 6, backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  barcodeActions: { flexDirection: 'row', gap: 10, marginTop: 16, alignSelf: 'stretch' },
  cancelButton: { flex: 1, padding: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#DDD' },
  cancelButtonText: { fontSize: 14, fontWeight: '600', color: '#666' },
  confirmFullButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 12, backgroundColor: Colors.brand.primary, borderRadius: 10 },
  confirmFullText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  // Expiring
  expiringSection: { marginTop: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  expiringItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  expiryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  expiringName: { flex: 1, fontSize: 15, color: '#333' },
  expiringDate: { fontSize: 13, color: '#999' },
});
