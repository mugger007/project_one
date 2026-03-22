import React, { useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useUserStore } from '../stores/userStore';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  UserProfile,
  loadUserProfile,
  saveUserProfile,
  getCurrentLocation,
} from '../services/profileService';
import { OnesieColors, OnesieTypography } from '../theme/tokens';

interface ValidationErrors {
  name?: string;
  email?: string;
  phone?: string;
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
  const navigation = useNavigation<any>();

  useEffect(() => {
    loadProfile();
    fetchCurrentLocation();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;

    const loadedProfile = await loadUserProfile(userId);
    if (loadedProfile) {
      setProfile(loadedProfile);
      setOriginalProfile(loadedProfile);
      setValidationErrors({});
    }

    setLoading(false);
  };

  const fetchCurrentLocation = async () => {
    const result = await getCurrentLocation();
    if (result.location) {
      setProfile((prev) => ({ ...prev, location: result.location }));
    }
  };

  const validateEmail = (email: string) => {
    if (!email.trim()) return '';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) ? '' : 'Please enter a valid email address';
  };

  const validatePhone = (phone: string) => {
    if (!phone.trim()) return '';
    const phoneRegex = /^\+?[\d\s\-\(\)]+$/;
    return phoneRegex.test(phone.replace(/\s/g, '')) ? '' : 'Please enter a valid phone number';
  };

  const validateName = (name: string) => {
    if (!name.trim()) return '';
    return name.trim().length >= 2 ? '' : 'Name must be at least 2 characters long';
  };

  const validateField = (field: keyof ValidationErrors, value: string) => {
    let error = '';
    if (field === 'name') error = validateName(value);
    if (field === 'email') error = validateEmail(value);
    if (field === 'phone') error = validatePhone(value);

    setValidationErrors((prev) => ({ ...prev, [field]: error }));
  };

  const saveProfile = async () => {
    if (!userId || saving) return;

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

    setValidationErrors(errors);

    if (Object.keys(errors).length > 0) {
      Alert.alert('Validation Error', 'Please fix the validation errors before saving.');
      return;
    }

    setSaving(true);
    const result = await saveUserProfile(userId, profile);

    if (result.success) {
      setOriginalProfile(profile);
      Alert.alert('Success', 'Profile updated successfully!');
    } else {
      Alert.alert('Error', result.error || 'Failed to save profile. Please try again.');
    }

    setSaving(false);
  };

  const hasChanges = () => JSON.stringify(profile) !== JSON.stringify(originalProfile);

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setProfile((prev) => ({ ...prev, dob: selectedDate.toISOString().split('T')[0] }));
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}> 
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 110 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>Profile</Text>
        <TouchableOpacity style={styles.settingsIconBtn} onPress={() => navigation.navigate('Settings')}>
          <Ionicons name="settings-outline" size={20} color={OnesieColors.navy} />
        </TouchableOpacity>
      </View>

      <View style={styles.contentBody}>

      <View style={styles.heroCard}>
        <View style={styles.heroAvatar}>
          <Text style={styles.heroInitial}>{(profile.name || 'U').trim().slice(0, 1).toUpperCase()}</Text>
          <Ionicons name="checkmark-circle" size={20} color={OnesieColors.teal} style={styles.verifiedIcon} />
        </View>
        <Text style={styles.heroName}>{profile.name || 'Your Name'}</Text>
        <Text style={styles.heroBio}>Serial swapper • Coffee addict • Singapore</Text>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Identity</Text>

        <Text style={styles.label}>Name</Text>
        <TextInput
          style={[styles.input, validationErrors.name ? styles.inputError : null]}
          value={profile.name}
          onChangeText={(text) => setProfile((prev) => ({ ...prev, name: text }))}
          onBlur={() => validateField('name', profile.name)}
          placeholder="Enter your name"
        />
        {!!validationErrors.name && <Text style={styles.errorText}>{validationErrors.name}</Text>}

        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.dateText}>{profile.dob ? new Date(profile.dob).toLocaleDateString() : 'Select date'}</Text>
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

        <Text style={styles.label}>Gender</Text>
        <View style={styles.genderContainer}>
          {['male', 'female', 'non_binary', 'prefer_not_to_say'].map((gender) => (
            <TouchableOpacity
              key={gender}
              style={[styles.genderOption, profile.gender === gender && styles.genderOptionSelected]}
              onPress={() => setProfile((prev) => ({ ...prev, gender }))}
            >
              <Text style={[styles.genderText, profile.gender === gender && styles.genderTextSelected]}>
                {gender.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Contact</Text>

        <Text style={styles.label}>Email</Text>
        <TextInput
          style={[styles.input, validationErrors.email ? styles.inputError : null]}
          value={profile.email}
          onChangeText={(text) => setProfile((prev) => ({ ...prev, email: text }))}
          onBlur={() => validateField('email', profile.email)}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {!!validationErrors.email && <Text style={styles.errorText}>{validationErrors.email}</Text>}

        <Text style={styles.label}>Phone Number</Text>
        <TextInput
          style={[styles.input, validationErrors.phone ? styles.inputError : null]}
          value={profile.phone}
          onChangeText={(text) => setProfile((prev) => ({ ...prev, phone: text }))}
          onBlur={() => validateField('phone', profile.phone)}
          placeholder="Enter your phone number"
          keyboardType="phone-pad"
        />
        {!!validationErrors.phone && <Text style={styles.errorText}>{validationErrors.phone}</Text>}

        <View style={styles.locationHeader}>
          <Text style={styles.label}>Location</Text>
          <TouchableOpacity onPress={fetchCurrentLocation}>
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.input, styles.readonlyInput]}
          value={profile.location}
          editable={false}
          placeholder="Location will be auto-detected"
        />

        <View style={styles.switchContainer}>
          <Text style={styles.switchLabel}>Notifications</Text>
          <Switch
            value={profile.notification_settings}
            onValueChange={(value) => setProfile((prev) => ({ ...prev, notification_settings: value }))}
          />
        </View>
      </View>

      {hasChanges() && (
        <View style={styles.unsavedBox}>
          <Text style={styles.unsavedText}>You have unsaved changes</Text>
        </View>
      )}

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={saveProfile}
          disabled={saving}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnesieColors.cream,
  },
  loadingText: {
    textAlign: 'center',
    color: OnesieColors.navy,
    fontSize: 18,
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: OnesieColors.white,
    borderBottomWidth: 1,
    borderBottomColor: OnesieColors.borderSoft,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  topBarTitle: {
    fontSize: OnesieTypography.h1,
    fontWeight: '900',
    color: OnesieColors.navy,
  },
  contentBody: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  settingsIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff2e8',
    borderWidth: 1,
    borderColor: '#ffd8cf',
  },
  heroCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5dfd6',
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  heroAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#E7F8F6',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  heroInitial: {
    color: OnesieColors.teal,
    fontSize: 30,
    fontWeight: '900',
  },
  verifiedIcon: {
    position: 'absolute',
    right: -2,
    bottom: -2,
  },
  heroName: {
    fontSize: 20,
    fontWeight: '800',
    color: OnesieColors.navy,
  },
  heroBio: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5dfd6',
    padding: 14,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: OnesieColors.navy,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
    backgroundColor: 'white',
  },
  inputError: {
    borderColor: '#ef4444',
  },
  errorText: {
    color: '#ef4444',
    fontSize: 13,
    marginTop: 4,
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    padding: 12,
    backgroundColor: 'white',
  },
  dateText: {
    fontSize: 14,
    color: '#374151',
  },
  genderContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  genderOption: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  genderOptionSelected: {
    backgroundColor: OnesieColors.coral,
    borderColor: OnesieColors.coral,
  },
  genderText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '600',
  },
  genderTextSelected: {
    color: 'white',
  },
  locationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refreshText: {
    color: OnesieColors.teal,
    fontWeight: '700',
    fontSize: 13,
  },
  readonlyInput: {
    backgroundColor: '#f9fafb',
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 14,
  },
  switchLabel: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '700',
  },
  unsavedBox: {
    marginTop: 2,
    marginBottom: 10,
    backgroundColor: '#fff5cf',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
  },
  unsavedText: {
    color: '#92400e',
    fontSize: 13,
    fontWeight: '700',
  },
  saveButton: {
    backgroundColor: OnesieColors.coral,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
  },
});