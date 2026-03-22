import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Image, StyleSheet, ActivityIndicator, TouchableOpacity, TextInput, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../stores/userStore';
import { fetchDeals, DealWithImage } from '../services/dealService';
import { OnesieColors, OnesieRadii, OnesieShadow, OnesieTypography } from '../theme/tokens';

export default function Explore() {
  const insets = useSafeAreaInsets();
  const { userId } = useUserStore();
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<DealWithImage[]>([]);
  const filters = ['All', 'Distance', 'Category', 'Newest'];

  useEffect(() => {
    const loadDeals = async () => {
      const data = await fetchDeals(userId);
      setDeals(data);
      setLoading(false);
    };
    loadDeals();
  }, [userId]);

  if (loading) {
    return (
      <View style={[styles.centerContainer, { paddingTop: insets.top + 16 }]}>
        <ActivityIndicator size="large" color={OnesieColors.coral} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerShell, { paddingTop: insets.top + 10 }]}> 
        <View style={styles.header}>
          <Text style={styles.title}>Explore Deals</Text>
        </View>

        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={OnesieColors.mutedNavy} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search deals or items..."
            placeholderTextColor={OnesieColors.mutedNavy}
          />
          <TouchableOpacity style={styles.filterButton}>
            <Ionicons name="options-outline" size={18} color={OnesieColors.coral} />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersScroll}
          contentContainerStyle={styles.filtersRow}
        >
          {filters.map((filter, index) => {
            const selected = index === 0;
            return (
              <TouchableOpacity key={filter} style={[styles.filterChip, selected && styles.filterChipSelected]}>
                <Text style={[styles.filterChipText, selected && styles.filterChipTextSelected]}>{filter}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={deals}
        numColumns={2}
        keyExtractor={(item) => item.id}
        columnWrapperStyle={styles.gridRow}
        contentContainerStyle={styles.gridContent}
        renderItem={({ item }) => (
          // Updated to match new Figma design v2 - masonry-like explore cards.
          <TouchableOpacity style={styles.gridCard} activeOpacity={0.92}>
            <Image source={{ uri: item.imageUrl }} style={styles.gridImage} />
            <View style={styles.gridInfo}>
              <Text numberOfLines={2} style={styles.gridTitle}>{item.merchant_name}</Text>
              <View style={styles.interestRow}>
                <View style={styles.avatarStack}>
                  <Image source={{ uri: item.imageUrl }} style={[styles.avatar, styles.avatarBack]} />
                  <Image source={{ uri: item.imageUrl }} style={styles.avatar} />
                </View>
                <Text style={styles.interestText}>12 interested</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnesieColors.cream,
  },
  headerShell: {
    backgroundColor: OnesieColors.white,
    borderBottomWidth: 1,
    borderBottomColor: OnesieColors.borderSoft,
    paddingHorizontal: 14,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: OnesieColors.cream,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: OnesieTypography.h1,
    fontWeight: '800',
    color: OnesieColors.navy,
  },
  searchWrap: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: OnesieColors.borderSoft,
    backgroundColor: OnesieColors.white,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    color: OnesieColors.navy,
    fontSize: OnesieTypography.bodySm,
    fontWeight: '500',
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFF3EA',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filtersScroll: {
    marginBottom: 6,
    maxHeight: 44,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 4,
    paddingRight: 6,
  },
  filterChip: {
    alignSelf: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(31, 42, 68, 0.08)',
    marginRight: 8,
  },
  filterChipSelected: {
    backgroundColor: OnesieColors.coral,
  },
  filterChipText: {
    color: OnesieColors.navy,
    fontSize: OnesieTypography.caption,
    fontWeight: '600',
  },
  filterChipTextSelected: {
    color: OnesieColors.white,
  },
  gridContent: {
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 100,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  gridCard: {
    width: '48.3%',
    borderRadius: OnesieRadii.card,
    backgroundColor: OnesieColors.white,
    overflow: 'hidden',
    ...OnesieShadow,
  },
  gridImage: {
    width: '100%',
    height: 130,
    resizeMode: 'cover',
  },
  gridInfo: {
    padding: 10,
  },
  gridTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: OnesieColors.navy,
    marginBottom: 8,
  },
  interestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarStack: {
    flexDirection: 'row',
  },
  avatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: OnesieColors.white,
    marginLeft: -5,
  },
  avatarBack: {
    opacity: 0.8,
  },
  interestText: {
    fontSize: 11,
    color: OnesieColors.mutedNavy,
    fontWeight: '600',
  },
});
