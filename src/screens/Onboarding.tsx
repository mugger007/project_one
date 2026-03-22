import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Alert,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserStore } from '../stores/userStore';
import { signUp, signIn, signInWithOAuth } from '../services/authService';
import { OnesieColors, OnesieTypography } from '../theme/tokens';

type AuthMode = 'signup' | 'signin';

export default function Onboarding() {
  const [mode, setMode] = useState<AuthMode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const setUserId = useUserStore((state) => state.setUserId);
  const insets = useSafeAreaInsets();

  const validateFields = () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter email and password');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validateFields() || submitting) return;

    setSubmitting(true);

    if (mode === 'signup') {
      const result = await signUp(email.trim(), password);
      if (result.error) {
        Alert.alert('Sign Up Error', result.error);
      } else {
        Alert.alert('Success', 'Check your email for confirmation.');
        if (result.userId) setUserId(result.userId);
      }
    } else {
      const result = await signIn(email.trim(), password);
      if (result.error) {
        Alert.alert('Sign In Error', result.error);
      } else {
        if (result.userId) setUserId(result.userId);
      }
    }

    setSubmitting(false);
  };

  const handleGoogle = async () => {
    const result = await signInWithOAuth('google');
    if (result.error) Alert.alert('Google Login Error', result.error);
  };

  return (
    <KeyboardAvoidingView
      style={styles.keyboardWrap}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.decorWrap}>
          <Ionicons name="sparkles" size={20} color={OnesieColors.coral} style={styles.decorIconLeft} />
          <Ionicons name="leaf-outline" size={22} color={OnesieColors.teal} style={styles.decorIconRight} />
        </View>

        <Text style={styles.brand}>Onesie</Text>
        <Text style={styles.title}>
          {mode === 'signup' ? 'Join the Onesie community' : 'Welcome back!'}
        </Text>
        <Text style={styles.subtitle}>
          {mode === 'signup' ? 'Start swapping deals with amazing people.' : 'Continue your swapping journey.'}
        </Text>

        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeChip, mode === 'signup' && styles.modeChipActive]}
            onPress={() => setMode('signup')}
          >
            <Text style={[styles.modeChipText, mode === 'signup' && styles.modeChipTextActive]}>Sign Up</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeChip, mode === 'signin' && styles.modeChipActive]}
            onPress={() => setMode('signin')}
          >
            <Text style={[styles.modeChipText, mode === 'signin' && styles.modeChipTextActive]}>Sign In</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={[styles.socialBtn, styles.appleBtn]} onPress={() => Alert.alert('Coming soon', 'Apple sign in is not configured yet.')}> 
          <Ionicons name="logo-apple" size={18} color="white" />
          <Text style={styles.appleBtnText}>Continue with Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.socialBtn, styles.googleBtn]} onPress={handleGoogle}>
          <Ionicons name="logo-google" size={18} color={OnesieColors.navy} />
          <Text style={styles.googleBtnText}>Continue with Google</Text>
        </TouchableOpacity>

        <View style={styles.dividerRow}>
          <View style={styles.divider} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.divider} />
        </View>

        <Text style={styles.inputLabel}>Email</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor="#93a0b2"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        <Text style={styles.inputLabel}>Password</Text>
        <TextInput
          style={styles.input}
          placeholder={mode === 'signup' ? 'Create a password' : 'Enter your password'}
          placeholderTextColor="#93a0b2"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoCapitalize="none"
        />

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          <Text style={styles.submitBtnText}>
            {submitting ? 'Please wait...' : mode === 'signup' ? 'Create Account' : 'Sign In'}
          </Text>
        </TouchableOpacity>

        {mode === 'signin' && (
          <View style={styles.trustBox}>
            <Ionicons name="shield-checkmark-outline" size={16} color={OnesieColors.teal} />
            <Text style={styles.trustText}>Your swaps are safe and private</Text>
          </View>
        )}

        <TouchableOpacity onPress={() => setMode(mode === 'signup' ? 'signin' : 'signup')}>
          <Text style={styles.bottomSwitchText}>
            {mode === 'signup' ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1,
    backgroundColor: OnesieColors.cream,
  },
  container: {
    flex: 1,
    backgroundColor: OnesieColors.cream,
  },
  decorWrap: {
    height: 30,
  },
  decorIconLeft: {
    position: 'absolute',
    top: 2,
    left: 2,
  },
  decorIconRight: {
    position: 'absolute',
    right: 6,
    top: 4,
  },
  brand: {
    fontSize: OnesieTypography.display,
    fontWeight: '900',
    color: OnesieColors.navy,
    textAlign: 'center',
    marginTop: 2,
  },
  title: {
    fontSize: OnesieTypography.h1,
    fontWeight: '900',
    color: OnesieColors.navy,
    marginTop: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: OnesieTypography.body,
    color: '#5d667a',
    marginTop: 8,
    marginBottom: 16,
    textAlign: 'center',
  },
  modeSwitch: {
    flexDirection: 'row',
    backgroundColor: 'rgba(31,42,68,0.08)',
    borderRadius: 999,
    padding: 4,
    marginBottom: 14,
  },
  modeChip: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 10,
    alignItems: 'center',
  },
  modeChipActive: {
    backgroundColor: OnesieColors.coral,
  },
  modeChipText: {
    color: OnesieColors.navy,
    fontWeight: '700',
    fontSize: 13,
  },
  modeChipTextActive: {
    color: 'white',
  },
  socialBtn: {
    borderRadius: 12,
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 10,
  },
  appleBtn: {
    backgroundColor: '#111827',
  },
  appleBtnText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  googleBtn: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#dbe0e7',
  },
  googleBtnText: {
    color: OnesieColors.navy,
    fontWeight: '700',
    fontSize: 14,
  },
  dividerRow: {
    marginVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(31,42,68,0.16)',
  },
  dividerText: {
    color: '#7b8598',
    fontSize: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: OnesieColors.navy,
    marginBottom: 6,
    marginTop: 2,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#d7dde6',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    marginBottom: 10,
    fontSize: 14,
    color: OnesieColors.navy,
  },
  submitBtn: {
    marginTop: 4,
    backgroundColor: OnesieColors.coral,
    borderRadius: 12,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
  trustBox: {
    marginTop: 12,
    backgroundColor: 'rgba(0,196,180,0.12)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  trustText: {
    color: '#0f766e',
    fontWeight: '700',
    fontSize: 12,
  },
  bottomSwitchText: {
    marginTop: 16,
    textAlign: 'center',
    color: OnesieColors.coral,
    fontWeight: '700',
    fontSize: 13,
  },
});