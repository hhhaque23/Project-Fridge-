import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { parseVoiceText, startWebSpeechRecognition, type ParsedVoiceItem } from '@/services/voiceService';
import { FadeInView, PressableScale, PulseView } from '@/components/Animated';

export default function VoiceAddScreen() {
  const router = useRouter();
  const [transcript, setTranscript] = useState('');
  const [items, setItems] = useState<ParsedVoiceItem[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const startListening = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice Recognition', 'On mobile, type or use the dictation key on your keyboard.');
      return;
    }
    setIsListening(true);
    recognitionRef.current = startWebSpeechRecognition(
      (text) => {
        setTranscript(text);
        setIsListening(false);
        handleParse(text);
      },
      (err) => {
        setIsListening(false);
        Alert.alert('Voice Error', String(err));
      }
    );
    if (!recognitionRef.current) setIsListening(false);
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleParse = async (text?: string) => {
    const input = text ?? transcript;
    if (!input.trim()) return;
    setIsParsing(true);
    const parsed = await parseVoiceText(input);
    setItems(parsed);
    setIsParsing(false);
  };

  const handleConfirmAll = () => {
    Alert.alert('Added', `${items.length} items added to inventory`);
    router.back();
  };

  const removeItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Voice Add', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Just talk to add items</Text>
            <Text style={styles.subtitle}>
              Try: "I just bought a dozen eggs, a bag of spinach, and 2 bell peppers"
            </Text>
          </View>

          {/* Mic button */}
          <View style={styles.micSection}>
            <PulseView active={isListening} color="#D32F2F" style={{ width: 96, height: 96, borderRadius: 48 }}>
              <PressableScale
                onPress={isListening ? stopListening : startListening}
                scaleTo={0.92}
              >
                <View style={[styles.micButton, isListening && styles.micButtonActive]}>
                  <FontAwesome name={isListening ? 'stop' : 'microphone'} size={36} color="#fff" />
                </View>
              </PressableScale>
            </PulseView>
            <Text style={styles.micLabel}>
              {isListening ? 'Listening...' : 'Tap to speak'}
            </Text>
            {Platform.OS !== 'web' && (
              <Text style={styles.micHint}>On mobile: use the dictation key on keyboard</Text>
            )}
          </View>

          {/* Text input fallback */}
          <View style={styles.textInputSection}>
            <Text style={styles.label}>Or type what you bought:</Text>
            <TextInput
              style={styles.textInput}
              placeholder="e.g. 3 apples, milk, sourdough loaf..."
              placeholderTextColor="#999"
              value={transcript}
              onChangeText={setTranscript}
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[styles.parseButton, !transcript.trim() && styles.buttonDisabled]}
              onPress={() => handleParse()}
              disabled={!transcript.trim() || isParsing}
            >
              {isParsing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <FontAwesome name="magic" size={14} color="#fff" />
                  <Text style={styles.parseButtonText}>Parse</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Parsed items */}
          {items.length > 0 && (
            <View style={styles.resultsSection}>
              <Text style={styles.resultsTitle}>Found {items.length} items</Text>
              {items.map((item, idx) => (
                <FadeInView key={idx} delay={idx * 50}>
                  <View style={styles.itemCard}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemMeta}>
                        {item.quantity} - {item.category}
                      </Text>
                    </View>
                    <PressableScale onPress={() => removeItem(idx)}>
                      <FontAwesome name="times" size={18} color="#999" />
                    </PressableScale>
                  </View>
                </FadeInView>
              ))}

              <FadeInView delay={items.length * 50 + 80}>
                <PressableScale style={styles.confirmButton} onPress={handleConfirmAll}>
                  <FontAwesome name="check" size={16} color="#fff" />
                  <Text style={styles.confirmButtonText}>Add All to Inventory</Text>
                </PressableScale>
              </FadeInView>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  scrollContent: { padding: 20 },
  header: { alignItems: 'center', marginBottom: 24 },
  title: { fontSize: 22, fontWeight: '700', color: '#1a1a1a', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#666', textAlign: 'center', marginTop: 8, lineHeight: 20, fontStyle: 'italic' },
  micSection: { alignItems: 'center', paddingVertical: 24 },
  micButton: { width: 96, height: 96, borderRadius: 48, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center', shadowColor: Colors.brand.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
  micButtonActive: { backgroundColor: '#D32F2F' },
  micLabel: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginTop: 12 },
  micHint: { fontSize: 12, color: '#999', marginTop: 4 },
  textInputSection: { marginTop: 12 },
  label: { fontSize: 14, fontWeight: '600', color: '#666', marginBottom: 8 },
  textInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: 12, padding: 14, fontSize: 15, color: '#1a1a1a', backgroundColor: '#FAFAFA', minHeight: 80, textAlignVertical: 'top' },
  parseButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#7C4DFF', borderRadius: 12, padding: 14, marginTop: 10 },
  parseButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  buttonDisabled: { opacity: 0.4 },
  resultsSection: { marginTop: 24 },
  resultsTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  itemCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 12, padding: 14, marginBottom: 8 },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  itemMeta: { fontSize: 12, color: '#666', marginTop: 2 },
  confirmButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.brand.primary, borderRadius: 12, padding: 14, marginTop: 12 },
  confirmButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
