import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Switch,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { useUserStore } from '../stores/userStore';
import { supabase } from '../supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface UserProfile {
  name: string;
  dob: string;
  gender: string;
  email: string;
  phone: string;
  location: string;
  notification_settings: boolean;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
  dob?: string;
}

export default function Profile() {
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    dob: '',
    gender: 'prefer_not_to_say',
    email: '',
    phone: '',
    location: '',
    notification_settings: true,
  });
  const [originalProfile, setOriginalProfile] = useState<UserProfile>(profile);
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { userId } = useUserStore();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadProfile();
    getCurrentLocation();
  }, []);

  // Remove auto-save useEffect

  const loadProfile = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, dob, gender, email, phone, location, notification_settings')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error loading profile:', error);
        return;
      }

      if (data) {
        const loadedProfile = {
          name: data.name || '',
          dob: data.dob || '',
          gender: data.gender || 'prefer_not_to_say',
          email: data.email || '',
          phone: data.phone || '',
          location: data.location || '',
          notification_settings: data.notification_settings ?? true,
        };
        setProfile(loadedProfile);
        setOriginalProfile(loadedProfile);
        setValidationErrors({}); // Clear any validation errors for loaded data
      } else {
        // If no data exists, set defaults
        const defaultProfile = {
          name: '',
          dob: '',
          gender: 'prefer_not_to_say',
          email: '',
          phone: '',
          location: '',
          notification_settings: true,
        };
        setProfile(defaultProfile);
        setOriginalProfile(defaultProfile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to get your current location.');
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      // Reverse geocode to get address
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address.length > 0) {
        const addr = address[0];
        const locationString = `${addr.city || ''}, ${addr.region || ''}, ${addr.country || ''}`.replace(/^, |, $/g, '');
        setProfile(prev => ({ ...prev, location: locationString }));
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const saveProfile = async () => {
    if (!userId || saving) return;

    // Validate all fields before saving
    const errors: ValidationErrors = {};
    if (profile.name.trim() && profile.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }
    if (profile.email.trim() && validateEmail(profile.email.trim())) {
      errors.email = validateEmail(profile.email.trim());
    }
    if (profile.phone.trim() && validatePhone(profile.phone.trim())) {
      errors.phone = validatePhone(profile.phone.trim());
    }

    // Update validation errors state
    setValidationErrors(errors);

    // If there are validation errors, don't save
    if (Object.keys(errors).length > 0) {
      Alert.alert('Validation Error', 'Please fix the validation errors before saving.');
      return;
    }

    setSaving(true);
    try {
      const updateData: any = {
        id: userId,
        gender: profile.gender,
        notification_settings: profile.notification_settings,
      };

      // Only include non-empty fields
      if (profile.name.trim()) updateData.name = profile.name.trim();
      if (profile.dob) updateData.dob = profile.dob;
      if (profile.email.trim()) updateData.email = profile.email.trim();
      if (profile.phone.trim()) updateData.phone = profile.phone.trim();
      // Skip location for now to avoid geometry errors
      // if (profile.location.trim()) updateData.location = profile.location.trim();

      const { error } = await supabase
        .from('users')
        .upsert(updateData);

      if (error) throw error;

      setOriginalProfile(profile);
      Alert.alert('Success', 'Profile updated successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = () => {
    return JSON.stringify(profile) !== JSON.stringify(originalProfile);
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setProfile(prev => ({ ...prev, dob: selectedDate.toISOString().split('T')[0] }));
    }
  };

  const validateEmail = (email: string) => {
    if (!email.trim()) return ''; // Empty is allowed
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? '' : 'Please enter a valid email address';
  };

  const validatePhone = (phone: string) => {
    if (!phone.trim()) return ''; // Empty is allowed
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone.replace(/\s/g, '')) ? '' : 'Please enter a valid phone number';
  };

  const validateName = (name: string) => {
    if (!name.trim()) return ''; // Empty is allowed
    return name.trim().length >= 2 ? '' : 'Name must be at least 2 characters long';
  };

  const validateField = (field: keyof ValidationErrors, value: string) => {
    let error = '';
    switch (field) {
      case 'name':
        error = validateName(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'phone':
        error = validatePhone(value);
        break;
    }

    setValidationErrors(prev => ({
      ...prev,
      [field]: error,
    }));
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 120 }]}>
        <Text style={styles.title}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 120 }]}>
      <View style={styles.section}>
        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, validationErrors.name ? styles.inputError : null]}
          value={profile.name}
          onChangeText={(text) => {
            setProfile(prev => ({ ...prev, name: text }));
            if (validationErrors.name) {
              setValidationErrors(prev => ({ ...prev, name: '' }));
            }
          }}
          onBlur={() => validateField('name', profile.name)}
          placeholder="Enter your name"
        />
        {validationErrors.name ? (
          <Text style={styles.errorText}>{validationErrors.name}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity
          style={styles.dateButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.dateText}>
            {profile.dob ? new Date(profile.dob).toLocaleDateString() : 'Select date'}
          </Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={profile.dob ? new Date(profile.dob) : new Date()}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderContainer}>
          {['male', 'female', 'non_binary', 'prefer_not_to_say'].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[
                styles.genderOption,
                profile.gender === gender && styles.genderOptionSelected,
              ]}
              onPress={() => setProfile(prev => ({ ...prev, gender }))}
            >
              <Text
                style={[
                  styles.genderText,
                  profile.gender === gender && styles.genderTextSelected,
                ]}
              >
                {gender.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, validationErrors.email ? styles.inputError : null]}
          value={profile.email}
          onChangeText={(text) => {
            setProfile(prev => ({ ...prev, email: text }));
            if (validationErrors.email) {
              setValidationErrors(prev => ({ ...prev, email: '' }));
            }
          }}
          onBlur={() => validateField('email', profile.email)}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {validationErrors.email ? (
          <Text style={styles.errorText}>{validationErrors.email}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={[styles.input, validationErrors.phone ? styles.inputError : null]}
          value={profile.phone}
          onChangeText={(text) => {
            setProfile(prev => ({ ...prev, phone: text }));
            if (validationErrors.phone) {
              setValidationErrors(prev => ({ ...prev, phone: '' }));
            }
          }}
          onBlur={() => validateField('phone', profile.phone)}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
        />
        {validationErrors.phone ? (
          <Text style={styles.errorText}>{validationErrors.phone}</Text>
        ) : null}
      </View>

      <View style={styles.section}>
        <View style={styles.locationHeader}>
          <Text style={styles.label}>Location</Text>
          <TouchableOpacity onPress={getCurrentLocation}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, { backgroundColor: '#f9f9f9' }]}
          value={profile.location}
          editable={false}
          placeholder="Location will be auto-detected"
        />
      </View>

      <View style={styles.section}>
        <Text style={styles.label}>Notification Settings</Text>
        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>
            {profile.notification_settings ? 'Enabled' : 'Disabled'}
          </Text>
          <Switch
            value={profile.notification_settings}
            onValueChange={(value) => setProfile(prev => ({ ...prev, notification_settings: value }))}
          />
        </View>
      </View>

      {hasChanges() && (
        <View style={styles.saveIndicator}>
          <Text style={styles.saveText}>You have unsaved changes</Text>
        </View>
      )}

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          <Text style={[styles.saveButtonText, saving && styles.saveButtonTextDisabled]}>
            {saving ? 'Saving...' : 'Save Profile'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
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
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#374151',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 14,
    marginTop: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    backgroundColor: 'white',
  },
  dateText: {
    fontSize: 16,
    color: '#374151',
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  genderOptionSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  genderText: {
    fontSize: 14,
    color: '#374151',
  },
  genderTextSelected: {
    color: 'white',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  refreshText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: '#374151',
  },
  saveIndicator: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center',
  },
  saveText: {
    color: '#92400e',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 30,
    marginBottom: 20,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    backgroundColor: '#ccc',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButtonTextDisabled: {
    color: '#999',
  },
});