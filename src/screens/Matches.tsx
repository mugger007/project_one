import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../stores/userStore';
import { fetchUserMatches, Match } from '../services/matchesService';

export default function Matches({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { userId } = useUserStore();
  const [matches, setMatches] = useState<Match[]>([]);
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
    >
      <View style={styles.matchRow}>
        {item.dealImageUrl ? (
          <Image 
            source={{ uri: item.dealImageUrl }} 
            style={styles.dealImage}
          />
        ) : (
          <View style={[styles.dealImage, styles.placeholderImage]}>
            <Text style={styles.placeholderText}>?</Text>
          </View>
        )}
        <View style={styles.matchContent}>
          <Text style={styles.dealName}>{item.dealName}</Text>
          <Text style={styles.matchedUser}>Matched with: {item.matchedUserName}</Text>
          <Text style={styles.matchDate}>
            {new Date(item.created_at).toLocaleDateString()}
          </Text>
        </View>
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
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <Text style={styles.title}>Matches</Text>
      {matches.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No matches yet</Text>
          <Text style={styles.emptySubText}>
            Start swiping on deals to find matches!
          </Text>
        </View>
      ) : (
        <FlatList
          data={matches}
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
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    color: '#1F2937',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  matchCard: {
    backgroundColor: 'white',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  matchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dealImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 16,
  },
  placeholderImage: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 24,
    color: '#9CA3AF',
  },
  matchContent: {
    flex: 1,
    flexDirection: 'column',
  },
  dealName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  matchedUser: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 4,
  },
  matchDate: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
});
