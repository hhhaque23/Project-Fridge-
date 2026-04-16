import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import Colors from '@/constants/Colors';
import { useRecipeStore } from '@/stores/recipeStore';
import type { Recipe, RecipeStep } from '@/lib/types';

export default function CookingModeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [timers, setTimers] = useState<Record<number, number>>({});
  const timerRefs = useRef<Record<number, NodeJS.Timeout>>({});

  const getRecipeById = useRecipeStore((s) => s.getRecipeById);

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
});
