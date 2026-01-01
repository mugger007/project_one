import React from 'react';
import { View, Text, Image } from 'react-native';

export default function Profile() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Image
        source={{ uri: 'https://via.placeholder.com/150' }}
        style={{ width: 128, height: 128, borderRadius: 64, marginBottom: 16 }}
      />
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#374151' }}>User Profile</Text>
      <Text style={{ fontSize: 18, color: '#6B7280', marginTop: 8 }}>user@example.com</Text>
    </View>
  );
}