import React from 'react';
import { View, Text, FlatList } from 'react-native';

export default function DealFeed() {
  const deals = [
    { id: '1', title: 'Deal 1', description: 'Great offer!' },
    { id: '2', title: 'Deal 2', description: 'Another deal.' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F3F4F6' }}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', padding: 16 }}>Deal Feed</Text>
      <FlatList
        data={deals}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: 'white', padding: 16, margin: 8, borderRadius: 8, shadowOpacity: 0.1 }}>
            <Text style={{ fontSize: 18, fontWeight: 'semibold' }}>{item.title}</Text>
            <Text style={{ color: '#6B7280' }}>{item.description}</Text>
          </View>
        )}
      />
    </View>
  );
}