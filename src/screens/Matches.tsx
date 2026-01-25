import React from 'react';
import { View, Text, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Matches() {
  const insets = useSafeAreaInsets();
  const matches = [
    { id: '1', name: 'Match 1', status: 'Active' },
    { id: '2', name: 'Match 2', status: 'Pending' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6', paddingTop: insets.top + 20 }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', padding: 16 }}>Matches</Text>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: 'white', padding: 16, margin: 8, borderRadius: 8, shadowOpacity: 0.1 }}>
            <Text style={{ fontSize: 18, fontWeight: 'semibold' }}>{item.name}</Text>
            <Text style={{ color: '#6B7280' }}>{item.status}</Text>
          </View>
        )}
      />
    </View>
  );
}