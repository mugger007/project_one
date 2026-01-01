import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

export default function Settings() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#374151', marginBottom: 16 }}>Settings</Text>
      <TouchableOpacity style={{ backgroundColor: '#3B82F6', padding: 16, borderRadius: 8 }}>
        <Text style={{ color: 'white', fontSize: 18, textAlign: 'center' }}>Option 1</Text>
      </TouchableOpacity>
      <TouchableOpacity style={{ backgroundColor: '#3B82F6', padding: 16, borderRadius: 8, marginTop: 16 }}>
        <Text style={{ color: 'white', fontSize: 18, textAlign: 'center' }}>Option 2</Text>
      </TouchableOpacity>
    </View>
  );
}