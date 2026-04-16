import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useRecipeStore } from '@/stores/recipeStore';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MEALS = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];

type MealPlan = Record<string, Record<string, string | null>>;

export default function MealPlanScreen() {
  const [mealPlan, setMealPlan] = useState<MealPlan>(() => {
    const empty: MealPlan = {};
    DAYS.forEach((day) => {
      empty[day] = {};
      MEALS.forEach((meal) => {
        empty[day][meal] = null;
      });
    });
    // Demo data
    empty['Mon']['Dinner'] = 'Chicken Stir Fry';
    empty['Tue']['Lunch'] = 'Leftover Stir Fry';
    empty['Wed']['Dinner'] = 'Spinach Pasta';
    empty['Fri']['Dinner'] = 'Tacos';
    empty['Sun']['Breakfast'] = 'Pancakes';
    return empty;
  });

  const { recipes } = useRecipeStore();

  const handleSlotPress = (day: string, meal: string) => {
    Alert.alert(
      `${day} - ${meal}`,
      mealPlan[day][meal] ? mealPlan[day][meal]! : 'Add a recipe to this slot',
      [
        { text: 'Cancel', style: 'cancel' },
        ...(mealPlan[day][meal]
          ? [
              {
                text: 'Remove',
                style: 'destructive' as const,
                onPress: () => {
                  setMealPlan((prev) => ({
                    ...prev,
                    [day]: { ...prev[day], [meal]: null },
                  }));
                },
              },
            ]
          : []),
        {
          text: 'Add Recipe',
          onPress: () => {
            // Pick first recipe for demo
            const recipe = recipes[0];
            setMealPlan((prev) => ({
              ...prev,
              [day]: { ...prev[day], [meal]: recipe?.title || 'New Meal' },
            }));
          },
        },
      ]
    );
  };

  const handleAutoPlan = () => {
    Alert.alert(
      'AI Auto-Plan',
      'Generate a full week meal plan optimized for your inventory and dietary preferences?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: () => {
            // Demo: fill in random recipes
            const newPlan: MealPlan = {};
            const sampleMeals = recipes.slice(0, 12).map((r) => r.title);
            DAYS.forEach((day) => {
              newPlan[day] = {};
              MEALS.forEach((meal) => {
                if (Math.random() > 0.4 && sampleMeals.length > 0) {
                  newPlan[day][meal] = sampleMeals[Math.floor(Math.random() * sampleMeals.length)];
                } else {
                  newPlan[day][meal] = null;
                }
              });
            });
            setMealPlan(newPlan);
          },
        },
      ]
    );
  };

  const totalMeals = Object.values(mealPlan).reduce(
    (sum, day) => sum + Object.values(day).filter(Boolean).length,
    0
  );

  return (
    <>
      <Stack.Screen options={{ title: 'Meal Plan', headerShown: true }} />
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.weekTitle}>This Week</Text>
            <Text style={styles.weekSubtitle}>{totalMeals} meals planned</Text>
          </View>
          <TouchableOpacity style={styles.autoPlanButton} onPress={handleAutoPlan}>
            <FontAwesome name="magic" size={14} color="#fff" />
            <Text style={styles.autoPlanText}>AI Auto-Plan</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {DAYS.map((day) => (
            <View key={day} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayName}>{day}</Text>
                <Text style={styles.dayMealCount}>
                  {Object.values(mealPlan[day]).filter(Boolean).length} meals
                </Text>
              </View>
              <View style={styles.mealsRow}>
                {MEALS.map((meal) => (
                  <TouchableOpacity
                    key={meal}
                    style={[
                      styles.mealSlot,
                      mealPlan[day][meal] && styles.mealSlotFilled,
                    ]}
                    onPress={() => handleSlotPress(day, meal)}
                  >
                    <Text style={styles.mealLabel}>{meal}</Text>
                    {mealPlan[day][meal] ? (
                      <Text style={styles.mealName} numberOfLines={2}>
                        {mealPlan[day][meal]}
                      </Text>
                    ) : (
                      <FontAwesome name="plus" size={12} color="#CCC" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Generate grocery list */}
          <TouchableOpacity style={styles.generateButton}>
            <FontAwesome name="shopping-cart" size={16} color="#fff" />
            <Text style={styles.generateButtonText}>Generate Grocery List from Plan</Text>
          </TouchableOpacity>
          <View style={{ height: 32 }} />
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, backgroundColor: '#fff' },
  weekTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  weekSubtitle: { fontSize: 13, color: '#999', marginTop: 2 },
  autoPlanButton: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#7C4DFF', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10 },
  autoPlanText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  scrollContent: { padding: 16, gap: 12 },
  dayCard: { backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  dayHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  dayName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  dayMealCount: { fontSize: 11, color: '#999' },
  mealsRow: { flexDirection: 'row', gap: 6 },
  mealSlot: { flex: 1, minHeight: 80, borderRadius: 8, borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed', padding: 8, justifyContent: 'center', alignItems: 'center', gap: 4 },
  mealSlotFilled: { backgroundColor: '#E8F5E9', borderStyle: 'solid', borderColor: Colors.brand.primaryLight },
  mealLabel: { fontSize: 10, color: '#999', fontWeight: '600' },
  mealName: { fontSize: 11, color: Colors.brand.primary, textAlign: 'center', fontWeight: '600' },
  generateButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.brand.primary, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  generateButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
