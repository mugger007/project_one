import React from 'react';
import { View, Text } from 'react-native';

export default function Onboarding() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#374151' }}>Welcome to the App</Text>
      <Text style={{ fontSize: 18, color: '#6B7280', marginTop: 16 }}>Let's get you started!</Text>
    </View>
  );
}