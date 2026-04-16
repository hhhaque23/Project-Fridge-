import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  FlatList,
  TextInput,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import Colors from '@/constants/Colors';
import { useRecipeStore } from '@/stores/recipeStore';
import { useInventoryStore } from '@/stores/inventoryStore';
import { useAuthStore } from '@/stores/authStore';
import { formatTimeMinutes } from '@/lib/helpers';
import { generateRecipe } from '@/services/recipeGenerator';
import type { Recipe } from '@/lib/types';
import { Alert, ActivityIndicator } from 'react-native';

const CUISINES = ['All', 'Italian', 'Mexican', 'Asian', 'American', 'Mediterranean', 'Indian'];

export default function RecipesScreen() {
  const [searchText, setSearchText] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedRecipe, setGeneratedRecipe] = useState<Recipe | null>(null);
  const router = useRouter();

  const recipes = useRecipeStore((s) => s.recipes);
  const rankedRecipes = useRecipeStore((s) => s.rankedRecipes);
  const cookNowRecipes = useRecipeStore((s) => s.cookNowRecipes);
  const almostThereRecipes = useRecipeStore((s) => s.almostThereRecipes);
  const fetchRecipes = useRecipeStore((s) => s.fetchRecipes);
  const rankRecipes = useRecipeStore((s) => s.rankRecipes);
  const searchRecipes = useRecipeStore((s) => s.searchRecipes);
  const loadRecipeDemoIfEmpty = useRecipeStore((s) => (s as any).loadDemoIfEmpty as () => void);
  const items = useInventoryStore((s) => s.items);
  const loadInvDemoIfEmpty = useInventoryStore((s) => s.loadDemoIfEmpty);
  const user = useAuthStore((s) => s.user);

  const handleGenerateRecipe = async () => {
    setIsGenerating(true);
    try {
      const recipe = await generateRecipe(items, { prioritizeExpiring: true });
      if (recipe) {
        setGeneratedRecipe(recipe);
      } else {
        Alert.alert('Failed', 'Could not generate a recipe. Try again.');
      }
    } catch {
      Alert.alert('Error', 'Recipe generation failed.');
    }
    setIsGenerating(false);
  };

  useEffect(() => {
    loadInvDemoIfEmpty();
    if (loadRecipeDemoIfEmpty) loadRecipeDemoIfEmpty();
    // Try to fetch real recipes (fall back to demo if Supabase unavailable)
    fetchRecipes();
  }, []);

  useEffect(() => {
    if (recipes.length > 0 && items.length > 0) {
      rankRecipes(items);
    }
  }, [recipes.length, items.length]);

  const getDisplayRecipes = () => {
    let list = searchText ? searchRecipes(searchText) : rankedRecipes;
    if (selectedCuisine !== 'All') {
      list = list.filter((r) => r.cuisine.toLowerCase() === selectedCuisine.toLowerCase());
    }
    return list;
  };

  const topRecipe = rankedRecipes[0];

  const RecipeCard = ({ recipe, compact = false }: { recipe: Recipe; compact?: boolean }) => (
    <TouchableOpacity
      style={compact ? styles.compactCard : styles.recipeCard}
      onPress={() => router.push(`/recipe/${recipe.id}` as any)}
    >
      {recipe.image_url ? (
        <Image source={{ uri: recipe.image_url }} style={compact ? styles.compactImage : styles.recipeImage} />
      ) : (
        <View style={[compact ? styles.compactImage : styles.recipeImage, styles.placeholderImage]}>
          <FontAwesome name="cutlery" size={compact ? 20 : 32} color="#ccc" />
        </View>
      )}
      <View style={styles.recipeInfo}>
        <Text style={styles.recipeTitle} numberOfLines={2}>{recipe.title}</Text>
        <View style={styles.recipeMeta}>
          <FontAwesome name="clock-o" size={12} color="#999" />
          <Text style={styles.recipeMetaText}>{formatTimeMinutes(recipe.total_time_min)}</Text>
          <FontAwesome name="signal" size={12} color="#999" />
          <Text style={styles.recipeMetaText}>{recipe.difficulty}</Text>
        </View>
        {recipe.inventory_coverage !== undefined && (
          <View style={styles.coverageRow}>
            <View style={styles.coverageBar}>
              <View style={[styles.coverageFill, { width: `${(recipe.inventory_coverage || 0) * 100}%` }]} />
            </View>
            <Text style={styles.coverageText}>
              {Math.round((recipe.inventory_coverage || 0) * 100)}% have
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView>
        {/* Search */}
        <View style={styles.searchContainer}>
          <FontAwesome name="search" size={16} color="#999" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search recipes..."
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={setSearchText}
          />
        </View>

        {!searchText && (
          <>
            {/* Use It or Lose It hero */}
            {topRecipe && (
              <TouchableOpacity
                style={styles.heroCard}
                onPress={() => router.push(`/recipe/${topRecipe.id}` as any)}
              >
                <View style={styles.heroBadge}>
                  <FontAwesome name="fire" size={12} color="#fff" />
                  <Text style={styles.heroBadgeText}>Use It or Lose It</Text>
                </View>
                <Text style={styles.heroTitle}>{topRecipe.title}</Text>
                <Text style={styles.heroSubtitle}>
                  {formatTimeMinutes(topRecipe.total_time_min)} &middot; {topRecipe.cuisine}
                </Text>
                <Text style={styles.heroDescription} numberOfLines={2}>
                  {topRecipe.description}
                </Text>
              </TouchableOpacity>
            )}

            {/* Cook Now shelf */}
            {cookNowRecipes.length > 0 && (
              <View style={styles.shelfSection}>
                <View style={styles.shelfHeader}>
                  <Text style={styles.shelfTitle}>Cook Now</Text>
                  <Text style={styles.shelfBadge}>100% ingredients</Text>
                </View>
                <FlatList
                  horizontal
                  data={cookNowRecipes.slice(0, 10)}
                  keyExtractor={(r) => r.id}
                  renderItem={({ item }) => <RecipeCard recipe={item} compact />}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />
              </View>
            )}

            {/* Almost There shelf */}
            {almostThereRecipes.length > 0 && (
              <View style={styles.shelfSection}>
                <View style={styles.shelfHeader}>
                  <Text style={styles.shelfTitle}>Almost There</Text>
                  <Text style={styles.shelfSubtitle}>Missing 1-2 items</Text>
                </View>
                <FlatList
                  horizontal
                  data={almostThereRecipes.slice(0, 10)}
                  keyExtractor={(r) => r.id}
                  renderItem={({ item }) => <RecipeCard recipe={item} compact />}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.horizontalList}
                />
              </View>
            )}

            {/* AI Generate button */}
            <TouchableOpacity
              style={styles.aiGenerateBanner}
              onPress={handleGenerateRecipe}
              disabled={isGenerating}
            >
              <View style={styles.aiIconBox}>
                {isGenerating ? (
                  <ActivityIndicator color="#7C4DFF" />
                ) : (
                  <FontAwesome name="magic" size={18} color="#7C4DFF" />
                )}
              </View>
              <View style={styles.aiTextBox}>
                <Text style={styles.aiBannerTitle}>
                  {isGenerating ? 'Generating recipe...' : 'AI Recipe from your fridge'}
                </Text>
                <Text style={styles.aiBannerSubtitle}>
                  Custom recipe using items expiring soon
                </Text>
              </View>
              <FontAwesome name="chevron-right" size={12} color="#999" />
            </TouchableOpacity>

            {/* Generated recipe preview */}
            {generatedRecipe && (
              <View style={styles.aiResultCard}>
                <View style={styles.aiResultHeader}>
                  <FontAwesome name="magic" size={14} color="#7C4DFF" />
                  <Text style={styles.aiResultBadge}>AI-Generated</Text>
                </View>
                <Text style={styles.aiResultTitle}>{generatedRecipe.title}</Text>
                <Text style={styles.aiResultDesc} numberOfLines={2}>
                  {generatedRecipe.description}
                </Text>
                <View style={styles.aiResultMeta}>
                  <Text style={styles.aiResultMetaText}>
                    {formatTimeMinutes(generatedRecipe.total_time_min)}
                  </Text>
                  <Text style={styles.aiResultMetaText}>
                    {generatedRecipe.servings} servings
                  </Text>
                  <Text style={styles.aiResultMetaText}>
                    {generatedRecipe.ingredients?.length || 0} ingredients
                  </Text>
                </View>
                <View style={styles.aiResultActions}>
                  <TouchableOpacity
                    style={styles.aiDismissButton}
                    onPress={() => setGeneratedRecipe(null)}
                  >
                    <Text style={styles.aiDismissText}>Dismiss</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.aiViewButton} onPress={handleGenerateRecipe}>
                    <FontAwesome name="refresh" size={12} color="#7C4DFF" />
                    <Text style={styles.aiViewText}>Regenerate</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Cuisine filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cuisineScroll} contentContainerStyle={styles.cuisineContainer}>
              {CUISINES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.cuisineChip, selectedCuisine === c && styles.cuisineChipActive]}
                  onPress={() => setSelectedCuisine(c)}
                >
                  <Text style={[styles.cuisineText, selectedCuisine === c && styles.cuisineTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </>
        )}

        {/* All recipes list */}
        <View style={styles.allRecipes}>
          <Text style={styles.allRecipesTitle}>
            {searchText ? 'Search Results' : 'All Recipes'}
          </Text>
          {getDisplayRecipes().slice(0, 20).map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
          {getDisplayRecipes().length === 0 && (
            <View style={styles.emptyState}>
              <FontAwesome name="cutlery" size={36} color="#ccc" />
              <Text style={styles.emptyText}>No recipes found</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', margin: 16, backgroundColor: '#F5F5F5', borderRadius: 12, paddingHorizontal: 14, height: 44, gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#1a1a1a' },
  heroCard: { margin: 16, marginTop: 0, backgroundColor: '#FFF3E0', borderRadius: 16, padding: 20 },
  heroBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FF6D00', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, alignSelf: 'flex-start', marginBottom: 8 },
  heroBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  heroTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  heroSubtitle: { fontSize: 14, color: '#666', marginTop: 4 },
  heroDescription: { fontSize: 14, color: '#666', marginTop: 8, lineHeight: 20 },
  shelfSection: { marginBottom: 20 },
  shelfHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 10, gap: 8 },
  shelfTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  shelfBadge: { fontSize: 12, color: Colors.brand.primary, fontWeight: '600', backgroundColor: '#E8F5E9', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  shelfSubtitle: { fontSize: 12, color: '#999' },
  horizontalList: { paddingLeft: 16, gap: 12 },
  compactCard: { width: 160, borderRadius: 12, backgroundColor: '#FAFAFA', overflow: 'hidden' },
  compactImage: { width: 160, height: 100, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  recipeCard: { flexDirection: 'row', backgroundColor: '#FAFAFA', borderRadius: 12, marginBottom: 10, overflow: 'hidden' },
  recipeImage: { width: 100, height: 100, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  placeholderImage: { alignItems: 'center', justifyContent: 'center' },
  recipeInfo: { flex: 1, padding: 12, justifyContent: 'center' },
  recipeTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  recipeMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  recipeMetaText: { fontSize: 12, color: '#999' },
  coverageRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6 },
  coverageBar: { flex: 1, height: 4, backgroundColor: '#E0E0E0', borderRadius: 2 },
  coverageFill: { height: 4, backgroundColor: Colors.brand.primaryLight, borderRadius: 2 },
  coverageText: { fontSize: 11, color: '#999' },
  aiGenerateBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F3E5F5', borderRadius: 14, padding: 14, marginHorizontal: 16, marginBottom: 12, gap: 12 },
  aiIconBox: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  aiTextBox: { flex: 1 },
  aiBannerTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a1a' },
  aiBannerSubtitle: { fontSize: 12, color: '#666', marginTop: 2 },
  aiResultCard: { backgroundColor: '#fff', marginHorizontal: 16, marginBottom: 12, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#E1BEE7' },
  aiResultHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  aiResultBadge: { fontSize: 11, fontWeight: '700', color: '#7C4DFF', textTransform: 'uppercase' },
  aiResultTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  aiResultDesc: { fontSize: 13, color: '#666', marginTop: 4, lineHeight: 18 },
  aiResultMeta: { flexDirection: 'row', gap: 12, marginTop: 8 },
  aiResultMetaText: { fontSize: 11, color: '#999', fontWeight: '500' },
  aiResultActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  aiDismissButton: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#DDD' },
  aiDismissText: { fontSize: 12, fontWeight: '600', color: '#666' },
  aiViewButton: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: '#F3E5F5' },
  aiViewText: { fontSize: 12, fontWeight: '600', color: '#7C4DFF' },
  cuisineScroll: { marginBottom: 8 },
  cuisineContainer: { paddingHorizontal: 16, gap: 8 },
  cuisineChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F5' },
  cuisineChipActive: { backgroundColor: Colors.brand.primary },
  cuisineText: { fontSize: 13, fontWeight: '600', color: '#666' },
  cuisineTextActive: { color: '#fff' },
  allRecipes: { paddingHorizontal: 16, paddingBottom: 20 },
  allRecipesTitle: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  emptyState: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 15, color: '#999', marginTop: 12 },
});
