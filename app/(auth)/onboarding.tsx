import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '@/stores/authStore';
import Colors from '@/constants/Colors';
import { FontAwesome } from '@expo/vector-icons';

const ALLERGIES = ['Peanuts', 'Tree Nuts', 'Shellfish', 'Fish', 'Eggs', 'Milk', 'Soy', 'Wheat', 'Sesame'];
const DIETS = ['None', 'Vegetarian', 'Vegan', 'Keto', 'Paleo', 'Halal', 'Kosher', 'Mediterranean', 'Gluten-Free'];
const INTOLERANCES = ['Lactose', 'Gluten', 'FODMAP', 'Fructose'];

export default function OnboardingScreen() {
  const [step, setStep] = useState(0);
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedDiet, setSelectedDiet] = useState('None');
  const [selectedIntolerances, setSelectedIntolerances] = useState<string[]>([]);
  const [householdName, setHouseholdName] = useState('');

  const { updateProfile, setOnboarded } = useAuthStore();
  const router = useRouter();

  const toggleItem = (item: string, list: string[], setList: (l: string[]) => void) => {
    if (list.includes(item)) {
      setList(list.filter((i) => i !== item));
    } else {
      setList([...list, item]);
    }
  };

  const handleFinish = async () => {
    await updateProfile({
      dietary_profile: {
        allergies: selectedAllergies,
        intolerances: selectedIntolerances,
        diet_type: selectedDiet === 'None' ? null : selectedDiet,
        calorie_target: null,
        macro_split: null,
      },
      onboarding_completed: true,
    } as any);
    setOnboarded();
    router.replace('/(tabs)');
  };

  const steps = [
    // Step 0: Welcome
    <View key="welcome" style={styles.stepContent}>
      <View style={styles.iconCircle}>
        <FontAwesome name="camera" size={48} color={Colors.brand.primary} />
      </View>
      <Text style={styles.stepTitle}>Welcome to FreshScan</Text>
      <Text style={styles.stepDescription}>
        Scan your fridge with AI, track expiry dates, and get recipes that use what's about to go bad.
      </Text>
      <View style={styles.featureList}>
        {[
          { icon: 'camera', text: 'AI-powered fridge scanning' },
          { icon: 'clock-o', text: 'Smart expiry tracking' },
          { icon: 'cutlery', text: 'Expiry-first recipe suggestions' },
          { icon: 'shopping-cart', text: 'Intelligent grocery lists' },
        ].map((f, i) => (
          <View key={i} style={styles.featureRow}>
            <FontAwesome name={f.icon as any} size={18} color={Colors.brand.primary} />
            <Text style={styles.featureText}>{f.text}</Text>
          </View>
        ))}
      </View>
    </View>,

    // Step 1: Allergies
    <View key="allergies" style={styles.stepContent}>
      <Text style={styles.stepTitle}>Any food allergies?</Text>
      <Text style={styles.stepDescription}>
        We'll flag recipes and scanned items that contain allergens.
      </Text>
      <View style={styles.chipGrid}>
        {ALLERGIES.map((a) => (
          <TouchableOpacity
            key={a}
            style={[styles.chip, selectedAllergies.includes(a) && styles.chipSelected]}
            onPress={() => toggleItem(a, selectedAllergies, setSelectedAllergies)}
          >
            <Text style={[styles.chipText, selectedAllergies.includes(a) && styles.chipTextSelected]}>
              {a}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>,

    // Step 2: Diet
    <View key="diet" style={styles.stepContent}>
      <Text style={styles.stepTitle}>Any dietary preferences?</Text>
      <Text style={styles.stepDescription}>
        Recipes will be filtered to match your diet.
      </Text>
      <View style={styles.chipGrid}>
        {DIETS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.chip, selectedDiet === d && styles.chipSelected]}
            onPress={() => setSelectedDiet(d)}
          >
            <Text style={[styles.chipText, selectedDiet === d && styles.chipTextSelected]}>
              {d}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>,

    // Step 3: Ready
    <View key="ready" style={styles.stepContent}>
      <View style={styles.iconCircle}>
        <FontAwesome name="check" size={48} color={Colors.brand.primary} />
      </View>
      <Text style={styles.stepTitle}>You're all set!</Text>
      <Text style={styles.stepDescription}>
        Start by scanning your fridge. Point your camera at a shelf and we'll identify everything.
      </Text>
    </View>,
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.progress}>
        {steps.map((_, i) => (
          <View
            key={i}
            style={[styles.progressDot, i <= step && styles.progressDotActive]}
          />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {steps[step]}
      </ScrollView>

      <View style={styles.footer}>
        {step > 0 && (
          <TouchableOpacity style={styles.backButton} onPress={() => setStep(step - 1)}>
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, step === 0 && { flex: 1 }]}
          onPress={() => {
            if (step < steps.length - 1) {
              setStep(step + 1);
            } else {
              handleFinish();
            }
          }}
        >
          <Text style={styles.nextButtonText}>
            {step === 0 ? 'Get Started' : step === steps.length - 1 ? 'Start Scanning' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  progress: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingTop: 16,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
  },
  progressDotActive: {
    backgroundColor: Colors.brand.primary,
    width: 24,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
  },
  stepContent: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  stepTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  stepDescription: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  featureList: {
    alignSelf: 'stretch',
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 4,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  chip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#E0E0E0',
    backgroundColor: '#FAFAFA',
  },
  chipSelected: {
    borderColor: Colors.brand.primary,
    backgroundColor: '#E8F5E9',
  },
  chipText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: Colors.brand.primary,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    padding: 24,
    gap: 12,
  },
  backButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  nextButton: {
    flex: 1,
    backgroundColor: Colors.brand.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
