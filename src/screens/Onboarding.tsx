import React, { useState } from 'react';
import { View, Text, Button, TextInput, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../supabase';

export default function Onboarding() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigation = useNavigation();

  const handleSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: 'User', gender: 'unknown' } }
    });
    if (error) {
      Alert.alert('Sign Up Error', error.message);
    } else {
      Alert.alert('Success', 'Check your email for confirmation');
      navigation.navigate('DealFeed' as never);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      Alert.alert('Sign In Error', error.message);
    } else {
      Alert.alert('Success', 'Logged in successfully');
      navigation.navigate('DealFeed' as never);
    }
  };

  const handleSocialLogin = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) {
      Alert.alert('Social Login Error', error.message);
    } else {
      // For OAuth, navigation might happen after redirect
      // navigation.navigate('DealFeed' as never);
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