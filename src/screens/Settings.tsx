import React, { useState, useEffect } from 'react';
import { View, Text, Switch, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import RangeSlider from 'rn-range-slider';
import { useUserStore } from '../stores/userStore';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadMatchSettings, saveMatchSettings, logout } from '../services/settingsService';

export default function Settings() {
  const [gender, setGender] = useState('both');
  const [distance, setDistance] = useState(50);
  const [minAge, setMinAge] = useState(21);
  const [maxAge, setMaxAge] = useState(35);
  const [originalSettings, setOriginalSettings] = useState({ gender: 'both', distance: 50, minAge: 21, maxAge: 35 });
  const [loading, setLoading] = useState(true);

  const { userId } = useUserStore();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    if (!userId) return;

    try {
      const settings = await loadMatchSettings(userId);
      if (settings) {
        setGender(settings.gender || 'both');
        setDistance(settings.distance || 50);
        setMinAge(settings.minAge || 21);
        setMaxAge(settings.maxAge || 35);
        setOriginalSettings({
          gender: settings.gender || 'both',
          distance: settings.distance || 50,
          minAge: settings.minAge || 21,
          maxAge: settings.maxAge || 35,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) return;

    if (minAge > maxAge) {
      Alert.alert('Invalid Range', 'Minimum age must be less than or equal to maximum age.');
      return;
    }

    try {
      const settings = { gender, distance, minAge, maxAge };
      const result = await saveMatchSettings(userId, settings);

      if (result.success) {
        setOriginalSettings(settings);
        Alert.alert('Success', 'Settings saved successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to save settings. Please try again.');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  };

  const handleCancel = () => {
    setGender(originalSettings.gender);
    setDistance(originalSettings.distance);
    setMinAge(originalSettings.minAge);
    setMaxAge(originalSettings.maxAge);
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
            const result = await logout();
            if (result.success) {
              navigation.navigate('Onboarding' as never);
            } else {
              Alert.alert('Error', result.error || 'Failed to logout. Please try again.');
            }
          }
        }
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 80 }]}>
        <Text style={styles.title}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 80 }]}>
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
        <Text style={styles.sectionTitle}>Age Range: {minAge} - {maxAge}</Text>
        <RangeSlider
          style={styles.rangeSlider}
          min={18}
          max={99}
          step={1}
          low={minAge}
          high={maxAge}
          floatingLabel
          renderThumb={() => <View style={styles.thumb} />}
          renderRail={() => <View style={styles.rail} />}
          renderRailSelected={() => <View style={styles.railSelected} />}
          renderLabel={(value) => <Text style={styles.label}>{String(Math.round(value || 0))}</Text>}
          onValueChanged={(low, high) => {
            setMinAge(Math.round(low));
            setMaxAge(Math.round(high));
          }}
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
  ageRangeContainer: {
    marginTop: 10,
  },
  ageSliderGroup: {
    marginBottom: 15,
  },
  ageLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  rangeSlider: {
    width: '100%',
    height: 60,
    marginTop: 10,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#007AFF',
    borderWidth: 2,
    borderColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  rail: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CCCCCC',
  },
  railSelected: {
    height: 4,
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
  label: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
    marginTop: 5,
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