import React, { useState } from 'react';
import { View, Text, Button, TextInput, Alert } from 'react-native';
import { useUserStore } from '../stores/userStore';
import { signUp, signIn, signInWithOAuth } from '../services/authService';

export default function Onboarding() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const setUserId = useUserStore((state) => state.setUserId);

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    const result = await signUp(email, password);
    
    if (result.error) {
      Alert.alert('Sign Up Error', result.error);
    } else {
      Alert.alert('Success', 'Check your email for confirmation');
      if (result.userId) {
        setUserId(result.userId);
      }
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }

    const result = await signIn(email, password);
    
    if (result.error) {
      Alert.alert('Sign In Error', result.error);
    } else {
      Alert.alert('Success', 'Logged in successfully');
      if (result.userId) {
        setUserId(result.userId);
      }
    }
  };

  const handleSocialLogin = async () => {
    const result = await signInWithOAuth('google');
    
    if (result.error) {
      Alert.alert('Social Login Error', result.error);
    }
  };

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'white', padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#374151', marginBottom: 16 }}>Welcome to the App</Text>
      <Text style={{ fontSize: 18, color: '#6B7280', marginBottom: 32 }}>Create an account or log in</Text>
      
      <TextInput
        style={{ width: '100%', height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 16, paddingHorizontal: 8 }}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={{ width: '100%', height: 40, borderColor: 'gray', borderWidth: 1, marginBottom: 32, paddingHorizontal: 8 }}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
      />
      
      <Button title="Sign Up" onPress={handleSignUp} />
      <View style={{ height: 16 }} />
      <Button title="Sign In" onPress={handleSignIn} />
      <View style={{ height: 16 }} />
      <Button title="Sign In with Google" onPress={handleSocialLogin} />
    </View>
  );
}