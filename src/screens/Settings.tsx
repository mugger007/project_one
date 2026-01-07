import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { useUserStore } from '../stores/userStore';
import { supabase } from '../supabase';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function Settings() {
  const [gender, setGender] = useState('both');
  const [distance, setDistance] = useState(50);
  const [age, setAge] = useState(25);
  const [originalSettings, setOriginalSettings] = useState({ gender: 'both', distance: 50, age: 25 });
  const [loading, setLoading] = useState(true);

  const { loadUserSettings, saveUserSettings } = useUserStore();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await loadUserSettings();
      if (settings) {
        setGender(settings.gender || 'both');
        setDistance(settings.distance || 50);
        setAge(settings.age || 25);
        setOriginalSettings({
          gender: settings.gender || 'both',
          distance: settings.distance || 50,
          age: settings.age || 25,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const settings = { gender, distance, age };
      await saveUserSettings(settings);
      setOriginalSettings(settings);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleCancel = () => {
    setGender(originalSettings.gender);
    setDistance(originalSettings.distance);
    setAge(originalSettings.age);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              navigation.navigate('Onboarding' as never);
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
        <Text style={styles.title}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Gender Preference</Text>
        <View style={styles.option}>
          <Text>Male</Text>
          <Switch
            value={gender === 'male'}
            onValueChange={(value) => setGender(value ? 'male' : 'both')}
          />
        </View>
        <View style={styles.option}>
          <Text>Female</Text>
          <Switch
            value={gender === 'female'}
            onValueChange={(value) => setGender(value ? 'female' : 'both')}
          />
        </View>
        <View style={styles.option}>
          <Text>Both</Text>
          <Switch
            value={gender === 'both'}
            onValueChange={(value) => setGender(value ? 'both' : 'male')}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Distance: {distance} km</Text>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={100}
          step={1}
          value={distance}
          onValueChange={setDistance}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#CCCCCC"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Age: {age}</Text>
        <Slider
          style={styles.slider}
          minimumValue={18}
          maximumValue={99}
          step={1}
          value={age}
          onValueChange={setAge}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#CCCCCC"
        />
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.logoutContainer}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: 'white',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 30,
    textAlign: 'center',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 15,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 40,
    paddingHorizontal: 20,
  },
  cancelButton: {
    backgroundColor: '#6B7280',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  logoutContainer: {
    marginTop: 40,
    alignItems: 'center',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 120,
  },
  logoutButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});