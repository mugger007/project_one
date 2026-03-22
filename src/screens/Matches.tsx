import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../stores/userStore';
import { fetchUserMatches, Match } from '../services/matchesService';
import { OnesieColors, OnesieTypography } from '../theme/tokens';

export default function Matches({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId } = useUserStore();
  const [matches, setMatches] = useState<Match[]>([]);
  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      loadMatches();
    }
  }, [userId]);

  const loadMatches = async () => {
    const matchesData = await fetchUserMatches(userId);
    setMatches(matchesData);
    setLoading(false);
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity
      style={styles.matchCard}
      onPress={() => navigation.navigate('Chat', { match: item })}
      activeOpacity={0.92}
    >
      <View style={styles.mediaRow}>
        {item.dealImageUrl ? (
          <Image
            source={{ uri: item.dealImageUrl }}
            style={styles.mediaImage}
          />
        ) : (
          <View style={[styles.mediaImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>Deal</Text>
          </View>
        )}

        <View style={[styles.mediaImage, styles.personCard]}>
          <Text style={styles.personInitials}>
            {(item.matchedUserName || 'U')
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </Text>
          <Text style={styles.personName} numberOfLines={1}>{item.matchedUserName}</Text>
        </View>
      </View>

      <View style={styles.contentRow}>
        <View style={styles.matchContent}>
          <Text style={styles.dealName} numberOfLines={1}>{item.dealName}</Text>
          <View style={styles.badgeRow}>
            <View style={styles.trustBadge}>
              <Text style={styles.trustBadgeText}>Verified match</Text>
            </View>
            <Text style={styles.matchDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.chatButton}
          onPress={() => navigation.navigate('Chat', { match: item })}
        >
          <Text style={styles.chatButtonText}>Chat now</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerShell, { paddingTop: insets.top + 10 }]}> 
        <Text style={styles.title}>Matches</Text>

        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'active' && styles.tabChipActive]}
            onPress={() => setActiveTab('active')}
          >
            <Text style={[styles.tabChipText, activeTab === 'active' && styles.tabChipTextActive]}>Active Matches</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabChip, activeTab === 'completed' && styles.tabChipActive]}
            onPress={() => setActiveTab('completed')}
          >
            <Text style={[styles.tabChipText, activeTab === 'completed' && styles.tabChipTextActive]}>Completed Deals</Text>
          </TouchableOpacity>
        </View>
      </View>

      {(activeTab === 'completed' ? [] : matches).length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No matches yet</Text>
          <Text style={styles.emptySubText}>
            Swipe more deals and your new match cards will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeTab === 'completed' ? [] : matches}
          keyExtractor={(item) => item.id}
          renderItem={renderMatch}
          contentContainerStyle={styles.listContent}
        />
      )}
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
    paddingHorizontal: 16,
    paddingBottom: 12,
    marginBottom: 10,
  },
  title: {
    fontSize: OnesieTypography.h1,
    fontWeight: '800',
    paddingTop: 8,
    paddingBottom: 10,
    color: OnesieColors.navy,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  tabChip: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: 'rgba(31,42,68,0.08)',
    paddingVertical: 11,
    alignItems: 'center',
  },
  tabChipActive: {
    backgroundColor: OnesieColors.coral,
  },
  tabChipText: {
    color: OnesieColors.navy,
    fontWeight: '700',
    fontSize: OnesieTypography.caption,
  },
  tabChipTextActive: {
    color: OnesieColors.white,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  matchCard: {
    backgroundColor: OnesieColors.white,
    padding: 14,
    marginBottom: 14,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE2D7',
    shadowColor: OnesieColors.navy,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 5,
  },
  mediaRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 12,
  },
  mediaImage: {
    flex: 1,
    height: 116,
    borderRadius: 14,
  },
  placeholderImage: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  personCard: {
    backgroundColor: '#F0FBFA',
    borderWidth: 1,
    borderColor: '#BFEDEA',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  personInitials: {
    fontSize: 30,
    fontWeight: '900',
    color: OnesieColors.teal,
    marginBottom: 4,
  },
  personName: {
    fontSize: 12,
    fontWeight: '700',
    color: OnesieColors.navy,
  },
  placeholderText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '700',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  matchContent: {
    flex: 1,
  },
  dealName: {
    fontSize: 18,
    fontWeight: '800',
    color: OnesieColors.navy,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  trustBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: '#E7F8F6',
    borderWidth: 1,
    borderColor: '#BFEDEA',
  },
  trustBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: OnesieColors.teal,
  },
  matchDate: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  chatButton: {
    backgroundColor: '#19B37D',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chatButtonText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '800',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 22,
    fontWeight: '800',
    color: OnesieColors.navy,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
