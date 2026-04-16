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
import type { VisionScanItem } from '@/lib/types';
import { getExpiryColor, getExpiryStatus } from '@/lib/helpers';

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResults, setScanResults] = useState<VisionScanItem[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  const user = useAuthStore((s) => s.user);
  const expiringItems = useInventoryStore((s) => s.getExpiringItems());

  const takePhoto = async () => {
    if (!cameraRef.current) return;
    const result = await cameraRef.current.takePictureAsync({ quality: 0.85 });
    if (result) {
      setPhoto(result.uri);
      setShowCamera(false);
      handleScan(result.uri);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
    });
    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
      handleScan(result.assets[0].uri);
    }
  };

  const handleScan = async (imageUri: string) => {
    setIsScanning(true);
    try {
      const results = await scanFridgeImage(imageUri);
      setScanResults(results);
    } catch {
      Alert.alert('Scan Failed', 'Could not analyze the image. Please try again.');
    }
    setIsScanning(false);
  };

  const confirmItem = (item: VisionScanItem) => {
    Alert.alert('Added', `${item.name} added to inventory`);
    setScanResults((prev) => prev.filter((i) => i !== item));
  };

  const confirmAll = () => {
    scanResults.filter((i) => i.confidence >= 85).forEach(confirmItem);
  };

  if (showCamera) {
    if (!permission?.granted) {
      return (
        <SafeAreaView style={styles.container}>
          <View style={styles.centered}>
            <FontAwesome name="camera" size={48} color="#999" />
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              FreshScan needs camera access to scan your fridge.
            </Text>
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
            <TouchableOpacity style={styles.closeButton} onPress={() => setShowCamera(false)}>
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {!photo && scanResults.length === 0 && (
          <View style={styles.heroSection}>
            <View style={styles.heroIcon}>
              <FontAwesome name="camera" size={56} color={Colors.brand.primary} />
            </View>
            <Text style={styles.heroTitle}>Scan Your Fridge</Text>
            <Text style={styles.heroSubtitle}>
              Take a photo of a shelf and our AI will identify all visible items.
            </Text>
            <View style={styles.scanOptions}>
              <TouchableOpacity style={styles.scanButton} onPress={() => setShowCamera(true)}>
                <FontAwesome name="camera" size={24} color="#fff" />
                <Text style={styles.scanButtonText}>Quick Snap</Text>
                <Text style={styles.scanButtonHint}>Take a photo now</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.scanButtonSecondary} onPress={pickImage}>
                <FontAwesome name="image" size={24} color={Colors.brand.primary} />
                <Text style={styles.scanButtonSecondaryText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {isScanning && (
          <View style={styles.scanningSection}>
            {photo && <Image source={{ uri: photo }} style={styles.previewImage} />}
            <ActivityIndicator size="large" color={Colors.brand.primary} style={{ marginTop: 16 }} />
            <Text style={styles.scanningText}>Analyzing image...</Text>
            <Text style={styles.scanningHint}>Identifying items, estimating quantities</Text>
          </View>
        )}

        {!isScanning && scanResults.length > 0 && (
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

        {!photo && expiringItems.length > 0 && (
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
  primaryButton: { backgroundColor: Colors.brand.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
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
  heroSection: { alignItems: 'center', paddingVertical: 40 },
  heroIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#E8F5E9', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  heroTitle: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  heroSubtitle: { fontSize: 15, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 22, maxWidth: 300 },
  scanOptions: { width: '100%', marginTop: 32, gap: 12 },
  scanButton: { backgroundColor: Colors.brand.primary, borderRadius: 16, padding: 20, alignItems: 'center', gap: 4 },
  scanButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
  scanButtonHint: { color: 'rgba(255,255,255,0.8)', fontSize: 13 },
  scanButtonSecondary: { borderWidth: 1.5, borderColor: Colors.brand.primary, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  scanButtonSecondaryText: { color: Colors.brand.primary, fontSize: 16, fontWeight: '600' },
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
  expiringSection: { marginTop: 32 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  expiringItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  expiryDot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  expiringName: { flex: 1, fontSize: 15, color: '#333' },
  expiringDate: { fontSize: 13, color: '#999' },
});
