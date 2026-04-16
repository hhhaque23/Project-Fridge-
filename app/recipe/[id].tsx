import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useRecipeStore } from '@/stores/recipeStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useGroceryStore } from '@/stores/groceryStore';
import { useAuthStore } from '@/stores/authStore';
import { formatTimeMinutes } from '@/lib/helpers';
import type { Recipe, RecipeIngredient } from '@/lib/types';

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [servings, setServings] = useState(4);

  const getRecipeById = useRecipeStore((s) => s.getRecipeById);
  const inventoryItems = useInventoryStore((s) => s.items);
  const addFromRecipe = useGroceryStore((s) => s.addFromRecipe);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (id) {
      const found = getRecipeById(id);
      if (found) {
        setRecipe(found);
        setServings(found.servings);
      }
    }
  }, [id]);

  if (!recipe) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loadingText}>Loading recipe...</Text>
      </View>
    );
  }

  const inventoryIds = new Set(inventoryItems.map((i) => i.ingredient_id));
  const scaleFactor = servings / recipe.servings;

  const handleAddMissing = async () => {
    if (!user?.household_id) return;
    await addFromRecipe(recipe.id, user.household_id, user.id);
    Alert.alert('Added', 'Missing ingredients added to grocery list');
  };

  const handleStartCooking = () => {
    router.push(`/cooking/${recipe.id}` as any);
  };

  return (
    <>
      <Stack.Screen options={{ title: recipe.title }} />
      <ScrollView style={styles.container}>
        {/* Image */}
        {recipe.image_url ? (
          <Image source={{ uri: recipe.image_url }} style={styles.heroImage} />
        ) : (
          <View style={[styles.heroImage, styles.placeholderImage]}>
            <FontAwesome name="cutlery" size={48} color="#ccc" />
          </View>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{recipe.title}</Text>
          <Text style={styles.description}>{recipe.description}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <FontAwesome name="clock-o" size={16} color={Colors.brand.primary} />
              <Text style={styles.metaValue}>{formatTimeMinutes(recipe.total_time_min)}</Text>
              <Text style={styles.metaLabel}>Total</Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome name="signal" size={16} color={Colors.brand.primary} />
              <Text style={styles.metaValue}>{recipe.difficulty}</Text>
              <Text style={styles.metaLabel}>Difficulty</Text>
            </View>
            <View style={styles.metaItem}>
              <FontAwesome name="star" size={16} color="#FFC107" />
              <Text style={styles.metaValue}>{recipe.avg_rating.toFixed(1)}</Text>
              <Text style={styles.metaLabel}>{recipe.rating_count} ratings</Text>
            </View>
          </View>

          {recipe.source_type === 'ai_generated' && (
            <View style={styles.aiBadge}>
              <FontAwesome name="magic" size={12} color="#7C4DFF" />
              <Text style={styles.aiBadgeText}>AI-Generated Recipe</Text>
            </View>
          )}
        </View>

        {/* Servings scaler */}
        <View style={styles.servingsRow}>
          <Text style={styles.servingsLabel}>Servings</Text>
          <View style={styles.servingsControl}>
            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => setServings(Math.max(1, servings - 1))}
            >
              <FontAwesome name="minus" size={12} color="#666" />
            </TouchableOpacity>
            <Text style={styles.servingsValue}>{servings}</Text>
            <TouchableOpacity
              style={styles.servingsButton}
              onPress={() => setServings(servings + 1)}
            >
              <FontAwesome name="plus" size={12} color="#666" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Ingredients */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ingredients</Text>
          {recipe.ingredients?.map((ri: RecipeIngredient, idx: number) => {
            const inInventory = inventoryIds.has(ri.ingredient_id);
            const scaledQty = (ri.quantity * scaleFactor).toFixed(ri.quantity % 1 === 0 ? 0 : 1);
            return (
              <View key={idx} style={styles.ingredientRow}>
                <FontAwesome
                  name={inInventory ? 'check-circle' : 'circle-o'}
                  size={18}
                  color={inInventory ? Colors.brand.primary : '#DDD'}
                />
                <Text style={[styles.ingredientText, inInventory && styles.ingredientHave]}>
                  {scaledQty} {ri.unit} {ri.ingredient?.name || ''}
                  {ri.preparation ? `, ${ri.preparation}` : ''}
                </Text>
                {ri.is_optional && <Text style={styles.optionalBadge}>optional</Text>}
              </View>
            );
          })}

          {/* Add missing to grocery */}
          <TouchableOpacity style={styles.addMissingButton} onPress={handleAddMissing}>
            <FontAwesome name="shopping-cart" size={14} color={Colors.brand.primary} />
            <Text style={styles.addMissingText}>Add missing to grocery list</Text>
          </TouchableOpacity>
        </View>

        {/* Nutrition */}
        {recipe.nutrition_per_serving && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Nutrition (per serving)</Text>
            <View style={styles.nutritionGrid}>
              {[
                { label: 'Calories', value: `${recipe.nutrition_per_serving.calories}` },
                { label: 'Protein', value: `${recipe.nutrition_per_serving.protein_g}g` },
                { label: 'Carbs', value: `${recipe.nutrition_per_serving.carbs_g}g` },
                { label: 'Fat', value: `${recipe.nutrition_per_serving.fat_g}g` },
                { label: 'Fiber', value: `${recipe.nutrition_per_serving.fiber_g}g` },
              ].map((n) => (
                <View key={n.label} style={styles.nutritionItem}>
                  <Text style={styles.nutritionValue}>{n.value}</Text>
                  <Text style={styles.nutritionLabel}>{n.label}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Instructions preview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Steps ({recipe.instructions?.length || 0})
          </Text>
          {recipe.instructions?.slice(0, 3).map((step, idx) => (
            <View key={idx} style={styles.stepRow}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{step.step}</Text>
              </View>
              <Text style={styles.stepText} numberOfLines={2}>{step.instruction}</Text>
            </View>
          ))}
          {(recipe.instructions?.length || 0) > 3 && (
            <Text style={styles.moreSteps}>
              +{(recipe.instructions?.length || 0) - 3} more steps
            </Text>
          )}
        </View>

        {/* Start cooking button */}
        <TouchableOpacity style={styles.cookButton} onPress={handleStartCooking}>
          <FontAwesome name="fire" size={18} color="#fff" />
          <Text style={styles.cookButtonText}>Start Cooking</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: '#999' },
  heroImage: { width: '100%', height: 250, backgroundColor: '#F0F0F0' },
  placeholderImage: { alignItems: 'center', justifyContent: 'center' },
  header: { padding: 20 },
  title: { fontSize: 26, fontWeight: '700', color: '#1a1a1a' },
  description: { fontSize: 15, color: '#666', marginTop: 8, lineHeight: 22 },
  metaRow: { flexDirection: 'row', marginTop: 16, gap: 24 },
  metaItem: { alignItems: 'center', gap: 4 },
  metaValue: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  metaLabel: { fontSize: 11, color: '#999' },
  aiBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#EDE7F6', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginTop: 12 },
  aiBadgeText: { fontSize: 12, fontWeight: '600', color: '#7C4DFF' },
  servingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FAFAFA' },
  servingsLabel: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  servingsControl: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  servingsButton: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, borderColor: '#DDD', alignItems: 'center', justifyContent: 'center' },
  servingsValue: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', minWidth: 24, textAlign: 'center' },
  section: { padding: 20, paddingTop: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a', marginBottom: 12 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, gap: 12 },
  ingredientText: { flex: 1, fontSize: 15, color: '#333' },
  ingredientHave: { color: Colors.brand.primary },
  optionalBadge: { fontSize: 11, color: '#999', backgroundColor: '#F5F5F5', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  addMissingButton: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, padding: 12, borderWidth: 1, borderColor: Colors.brand.primary, borderRadius: 10, justifyContent: 'center' },
  addMissingText: { fontSize: 14, fontWeight: '600', color: Colors.brand.primary },
  nutritionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  nutritionItem: { alignItems: 'center', backgroundColor: '#F9F9F9', borderRadius: 10, padding: 12, minWidth: 70 },
  nutritionValue: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  nutritionLabel: { fontSize: 11, color: '#999', marginTop: 2 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 12 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.brand.primary, alignItems: 'center', justifyContent: 'center' },
  stepNumberText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  stepText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
  moreSteps: { fontSize: 14, color: Colors.brand.primary, fontWeight: '600', marginTop: 8 },
  cookButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginHorizontal: 20, backgroundColor: Colors.brand.accent, borderRadius: 14, paddingVertical: 16 },
  cookButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },
});
