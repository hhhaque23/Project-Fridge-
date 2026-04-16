import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  Modal,
  TextInput,
  Platform,
  ScrollView,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Colors from '@/constants/Colors';
import { useRecipeStore } from '@/stores/recipeStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { startWebSpeechRecognition } from '@/services/voiceService';
import type { Recipe, RecipeStep } from '@/lib/types';

export default function CookingModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [timers, setTimers] = useState<Record<number, number>>({});
  const [showSubstitution, setShowSubstitution] = useState(false);
  const [missingIngredient, setMissingIngredient] = useState('');
  const [substitutions, setSubstitutions] = useState<{ name: string; reason: string; have_in_inventory: boolean }[]>([]);
  const [isLoadingSub, setIsLoadingSub] = useState(false);
  const [voiceListening, setVoiceListening] = useState(false);
  const timerRefs = useRef<Record<number, NodeJS.Timeout>>({});
  const voiceRef = useRef<{ stop: () => void } | null>(null);

  const getRecipeById = useRecipeStore((s) => s.getRecipeById);
  const inventoryItems = useInventoryStore((s) => s.items);

  useEffect(() => {
    if (id) {
      const found = getRecipeById(id);
      if (found) setRecipe(found);
    }
    // Keep screen awake during cooking
    activateKeepAwakeAsync('cooking').catch(() => {});
    return () => {
      deactivateKeepAwake('cooking');
      Object.values(timerRefs.current).forEach(clearInterval);
    };
  }, [id]);

  const startTimer = (stepIdx: number, minutes: number) => {
    if (timerRefs.current[stepIdx]) return;

    const totalSeconds = minutes * 60;
    setTimers((prev) => ({ ...prev, [stepIdx]: totalSeconds }));

    timerRefs.current[stepIdx] = setInterval(() => {
      setTimers((prev) => {
        const remaining = (prev[stepIdx] || 0) - 1;
        if (remaining <= 0) {
          clearInterval(timerRefs.current[stepIdx]);
          delete timerRefs.current[stepIdx];
          Alert.alert('Timer Done!', `Step ${stepIdx + 1} timer is up!`);
          return { ...prev, [stepIdx]: 0 };
        }
        return { ...prev, [stepIdx]: remaining };
      });
    }, 1000);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const SUBSTITUTION_DB: Record<string, { name: string; reason: string }[]> = {
    'heavy cream': [
      { name: 'Greek Yogurt', reason: 'Same texture, adds tang. Use 1:1.' },
      { name: 'Whole Milk + Butter', reason: '3/4 cup milk + 1/4 cup melted butter = 1 cup cream' },
      { name: 'Coconut Cream', reason: 'Vegan-friendly, slight coconut flavor' },
    ],
    'butter': [
      { name: 'Olive Oil', reason: 'Use 3/4 the amount. Best for sautéing.' },
      { name: 'Greek Yogurt', reason: 'For baking, use half the amount + reduce other liquids' },
      { name: 'Coconut Oil', reason: '1:1 swap, adds slight coconut flavor' },
    ],
    'egg': [
      { name: 'Flax Egg', reason: '1 tbsp ground flax + 3 tbsp water = 1 egg (for baking)' },
      { name: 'Greek Yogurt', reason: '1/4 cup yogurt = 1 egg (for binding)' },
      { name: 'Mashed Banana', reason: '1/2 banana = 1 egg (for moisture in baking)' },
    ],
    'milk': [
      { name: 'Greek Yogurt + Water', reason: 'Mix 1:1, use 1:1 for baking' },
      { name: 'Half-and-half', reason: 'Richer; use 1:1' },
      { name: 'Sour Cream', reason: 'Tangy; use 1:1, but reduce other liquids' },
    ],
    'lemon': [
      { name: 'Lime', reason: 'Almost identical, slightly less tart' },
      { name: 'Vinegar', reason: '1/2 the amount; works for acidity but no citrus flavor' },
      { name: 'Bottled Lemon Juice', reason: 'Just check for any in fridge door' },
    ],
    'parsley': [
      { name: 'Cilantro', reason: 'Different flavor but same role; use 1:1' },
      { name: 'Basil', reason: 'For Italian dishes; sweeter' },
      { name: 'Spinach', reason: 'Mild; works as garnish only' },
    ],
    'cilantro': [
      { name: 'Parsley', reason: 'Use 1:1 if you don\'t like cilantro' },
      { name: 'Basil', reason: 'For different flavor profile' },
    ],
    'onion': [
      { name: 'Shallot', reason: 'Milder, sweeter; use 1:1' },
      { name: 'Leek', reason: 'White part only, use 1:1' },
      { name: 'Onion Powder', reason: '1 tbsp = 1 medium onion' },
    ],
    'garlic': [
      { name: 'Garlic Powder', reason: '1/8 tsp powder = 1 clove' },
      { name: 'Shallot', reason: 'Milder garlic flavor' },
    ],
  };

  const findSubstitutions = (ingredientName: string) => {
    const lower = ingredientName.toLowerCase().trim();
    setIsLoadingSub(true);

    // Find matching substitutions in DB
    let foundSubs: { name: string; reason: string }[] = [];
    for (const [key, subs] of Object.entries(SUBSTITUTION_DB)) {
      if (lower.includes(key)) {
        foundSubs = subs;
        break;
      }
    }

    // Annotate with whether user has them in inventory
    const inventoryNames = new Set(inventoryItems.map((i) => i.ingredient?.name?.toLowerCase() || ''));
    const annotated = foundSubs.map((s) => ({
      ...s,
      have_in_inventory: Array.from(inventoryNames).some((inv) =>
        s.name.toLowerCase().includes(inv) || inv.includes(s.name.toLowerCase())
      ),
    }));

    if (annotated.length === 0) {
      // Generic fallback
      annotated.push(
        { name: 'Skip it', reason: `Try the recipe without ${ingredientName}`, have_in_inventory: true },
        { name: 'Search online', reason: `No common substitutes for ${ingredientName} in our database`, have_in_inventory: false }
      );
    }

    setSubstitutions(annotated);
    setIsLoadingSub(false);
  };

  const startVoiceSubstitution = () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Voice', 'On mobile: type the ingredient name. Web supports voice via Chrome/Edge.');
      return;
    }
    setShowSubstitution(true);
    setVoiceListening(true);
    voiceRef.current = startWebSpeechRecognition(
      (text) => {
        // Extract ingredient from phrases like "I'm out of heavy cream"
        const cleaned = text
          .toLowerCase()
          .replace(/^(i'm? out of|i don't have|substitute for|replace|swap)\s+/i, '')
          .trim();
        setMissingIngredient(cleaned);
        findSubstitutions(cleaned);
        setVoiceListening(false);
      },
      () => {
        setVoiceListening(false);
        Alert.alert('Voice Error', 'Could not recognize speech');
      }
    );
    if (!voiceRef.current) setVoiceListening(false);
  };

  const handleDone = () => {
    Alert.alert(
      'Finished Cooking?',
      'Mark this recipe as cooked? Ingredients will be deducted from inventory.',
      [
        { text: 'Not yet', style: 'cancel' },
        {
          text: 'Done!',
          onPress: () => {
            // In production: trigger inventory deduction + leftover creation
            router.back();
          },
        },
      ]
    );
  };

  if (!recipe || !recipe.instructions) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </SafeAreaView>
    );
  }

  const steps = recipe.instructions;
  const step = steps[currentStep];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <FontAwesome name="times" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{recipe.title}</Text>
        <Text style={styles.stepCounter}>
          {currentStep + 1}/{steps.length}
        </Text>
      </View>

      {/* Progress */}
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${((currentStep + 1) / steps.length) * 100}%` }]} />
      </View>

      {/* Quick action bar */}
      <View style={styles.quickActions}>
        <TouchableOpacity style={styles.quickAction} onPress={startVoiceSubstitution}>
          <FontAwesome name="microphone" size={14} color="#fff" />
          <Text style={styles.quickActionText}>Voice Substitute</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.quickAction}
          onPress={() => { setShowSubstitution(true); setMissingIngredient(''); setSubstitutions([]); }}
        >
          <FontAwesome name="search" size={14} color="#fff" />
          <Text style={styles.quickActionText}>Find Substitute</Text>
        </TouchableOpacity>
      </View>

      {/* Step content */}
      <View style={styles.stepContent}>
        <Text style={styles.stepLabel}>Step {step.step}</Text>
        <Text style={styles.stepInstruction}>{step.instruction}</Text>

        {step.tip && (
          <View style={styles.tipBox}>
            <FontAwesome name="lightbulb-o" size={16} color="#FFC107" />
            <Text style={styles.tipText}>{step.tip}</Text>
          </View>
        )}

        {/* Timer */}
        {step.timer_minutes && (
          <View style={styles.timerSection}>
            {timers[currentStep] !== undefined && timers[currentStep] > 0 ? (
              <View style={styles.timerActive}>
                <Text style={styles.timerDisplay}>{formatTimer(timers[currentStep])}</Text>
                <Text style={styles.timerLabel}>remaining</Text>
              </View>
            ) : timers[currentStep] === 0 ? (
              <View style={styles.timerDone}>
                <FontAwesome name="check-circle" size={24} color={Colors.brand.primary} />
                <Text style={styles.timerDoneText}>Timer complete!</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.timerButton}
                onPress={() => startTimer(currentStep, step.timer_minutes!)}
              >
                <FontAwesome name="clock-o" size={20} color="#fff" />
                <Text style={styles.timerButtonText}>
                  Start {step.timer_minutes} min timer
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      {/* Navigation */}
      <View style={styles.navBar}>
        <TouchableOpacity
          style={[styles.navButton, currentStep === 0 && styles.navButtonDisabled]}
          onPress={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
        >
          <FontAwesome name="arrow-left" size={18} color={currentStep === 0 ? '#666' : '#fff'} />
          <Text style={[styles.navButtonText, currentStep === 0 && styles.navButtonTextDisabled]}>
            Previous
          </Text>
        </TouchableOpacity>

        {currentStep < steps.length - 1 ? (
          <TouchableOpacity
            style={styles.navButtonPrimary}
            onPress={() => setCurrentStep(currentStep + 1)}
          >
            <Text style={styles.navButtonPrimaryText}>Next Step</Text>
            <FontAwesome name="arrow-right" size={18} color="#fff" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.navButtonPrimary, { backgroundColor: Colors.brand.primary }]}
            onPress={handleDone}
          >
            <FontAwesome name="check" size={18} color="#fff" />
            <Text style={styles.navButtonPrimaryText}>Done!</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Substitution Modal */}
      <Modal
        visible={showSubstitution}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSubstitution(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowSubstitution(false)}>
          <Pressable style={styles.modalCard} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <FontAwesome name="exchange" size={20} color={Colors.brand.primaryLight} />
              <Text style={styles.modalTitle}>Ingredient Substitute</Text>
              <TouchableOpacity onPress={() => setShowSubstitution(false)}>
                <FontAwesome name="times" size={20} color="#999" />
              </TouchableOpacity>
            </View>

            {voiceListening && (
              <View style={styles.voiceListening}>
                <ActivityIndicator color={Colors.brand.primaryLight} />
                <Text style={styles.voiceListeningText}>Listening... say "I'm out of [ingredient]"</Text>
              </View>
            )}

            <Text style={styles.modalLabel}>What ingredient are you missing?</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. heavy cream, butter, eggs"
                placeholderTextColor="#666"
                value={missingIngredient}
                onChangeText={setMissingIngredient}
                onSubmitEditing={() => findSubstitutions(missingIngredient)}
              />
              <TouchableOpacity
                style={styles.searchSubButton}
                onPress={() => findSubstitutions(missingIngredient)}
                disabled={!missingIngredient.trim() || isLoadingSub}
              >
                <FontAwesome name="search" size={14} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Quick suggestions */}
            {substitutions.length === 0 && !isLoadingSub && (
              <View style={styles.suggestionRow}>
                {['heavy cream', 'butter', 'egg', 'milk', 'lemon', 'parsley'].map((s) => (
                  <TouchableOpacity
                    key={s}
                    style={styles.suggestionChip}
                    onPress={() => { setMissingIngredient(s); findSubstitutions(s); }}
                  >
                    <Text style={styles.suggestionChipText}>{s}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <ScrollView style={styles.subResults} contentContainerStyle={{ paddingBottom: 20 }}>
              {substitutions.map((sub, idx) => (
                <View key={idx} style={[styles.subCard, sub.have_in_inventory && styles.subCardHave]}>
                  <View style={styles.subCardHeader}>
                    <Text style={styles.subName}>{sub.name}</Text>
                    {sub.have_in_inventory && (
                      <View style={styles.haveBadge}>
                        <FontAwesome name="check-circle" size={11} color={Colors.brand.primary} />
                        <Text style={styles.haveBadgeText}>You have this</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.subReason}>{sub.reason}</Text>
                </View>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a1a' },
  loadingText: { color: '#fff', fontSize: 16, textAlign: 'center', marginTop: 100 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12 },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: '600', color: '#fff', textAlign: 'center', marginHorizontal: 12 },
  stepCounter: { fontSize: 14, color: '#999', fontWeight: '600' },
  progressBar: { height: 3, backgroundColor: '#333', marginHorizontal: 20 },
  progressFill: { height: 3, backgroundColor: Colors.brand.primaryLight, borderRadius: 2 },
  stepContent: { flex: 1, justifyContent: 'center', paddingHorizontal: 32 },
  stepLabel: { fontSize: 14, fontWeight: '600', color: Colors.brand.primaryLight, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 1 },
  stepInstruction: { fontSize: 28, fontWeight: '600', color: '#fff', lineHeight: 38 },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: 'rgba(255,193,7,0.1)', borderRadius: 12, padding: 14, marginTop: 24 },
  tipText: { flex: 1, fontSize: 14, color: '#FFC107', lineHeight: 20 },
  timerSection: { marginTop: 32, alignItems: 'center' },
  timerButton: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.brand.accent, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 24 },
  timerButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  timerActive: { alignItems: 'center' },
  timerDisplay: { fontSize: 56, fontWeight: '700', color: Colors.brand.primaryLight, fontVariant: ['tabular-nums'] },
  timerLabel: { fontSize: 14, color: '#999', marginTop: 4 },
  timerDone: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timerDoneText: { fontSize: 16, color: Colors.brand.primary, fontWeight: '600' },
  navBar: { flexDirection: 'row', padding: 20, gap: 12 },
  navButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#444' },
  navButtonDisabled: { borderColor: '#333' },
  navButtonText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  navButtonTextDisabled: { color: '#666' },
  navButtonPrimary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.brand.accent, borderRadius: 12, paddingVertical: 14 },
  navButtonPrimaryText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  quickActions: { flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 8, gap: 8 },
  quickAction: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#7C4DFF', paddingVertical: 8, borderRadius: 10 },
  quickActionText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#1e1e1e', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '80%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#333' },
  modalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: '#fff' },
  voiceListening: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#2a2a2a', borderRadius: 10, padding: 12, marginBottom: 12 },
  voiceListeningText: { flex: 1, color: Colors.brand.primaryLight, fontSize: 13 },
  modalLabel: { fontSize: 13, color: '#999', fontWeight: '600', marginBottom: 8 },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  modalInput: { flex: 1, backgroundColor: '#2a2a2a', borderRadius: 10, padding: 12, fontSize: 15, color: '#fff' },
  searchSubButton: { width: 44, borderRadius: 10, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  suggestionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 },
  suggestionChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: '#2a2a2a' },
  suggestionChipText: { fontSize: 12, color: '#bbb' },
  subResults: { maxHeight: 320 },
  subCard: { backgroundColor: '#2a2a2a', borderRadius: 12, padding: 14, marginBottom: 8 },
  subCardHave: { borderWidth: 1, borderColor: Colors.brand.primary },
  subCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  subName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  haveBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#1a3a1f', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  haveBadgeText: { fontSize: 10, color: Colors.brand.primary, fontWeight: '700' },
  subReason: { fontSize: 13, color: '#bbb', lineHeight: 18 },
});
