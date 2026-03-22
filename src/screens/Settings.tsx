import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert, TouchableOpacity, ScrollView } from 'react-native';
import Slider from '@react-native-community/slider';
import RangeSlider from 'rn-range-slider';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../stores/userStore';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { loadMatchSettings, saveMatchSettings, logout } from '../services/settingsService';
import { OnesieColors, OnesieTypography } from '../theme/tokens';

const categoryOptions = ['Electronics', 'Fashion', 'Home', 'Books', 'Sports', 'Music', 'Art', 'Toys'];

export default function Settings() {
  const [gender, setGender] = useState<'male' | 'female' | 'both'>('both');
  const [distance, setDistance] = useState(50);
  const [minAge, setMinAge] = useState(21);
  const [maxAge, setMaxAge] = useState(35);
  const [notifications, setNotifications] = useState(true);
  const [open2for1, setOpen2for1] = useState(true);
  const [selectedCategories, setSelectedCategories] = useState<string[]>(['Electronics', 'Fashion']);
  const [originalSettings, setOriginalSettings] = useState({ gender: 'both' as 'male' | 'female' | 'both', distance: 50, minAge: 21, maxAge: 35 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { userId } = useUserStore();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadSettings();
  }, [userId]);

  const loadSettings = async () => {
    if (!userId) return;

    try {
      const settings = await loadMatchSettings(userId);
      if (settings) {
        const normalized = {
          gender: (settings.gender || 'both') as 'male' | 'female' | 'both',
          distance: settings.distance || 50,
          minAge: settings.minAge || 21,
          maxAge: settings.maxAge || 35,
        };

        setGender(normalized.gender);
        setDistance(normalized.distance);
        setMinAge(normalized.minAge);
        setMaxAge(normalized.maxAge);
        setOriginalSettings(normalized);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId || saving) return;

    if (minAge > maxAge) {
      Alert.alert('Invalid Range', 'Minimum age must be less than or equal to maximum age.');
      return;
    }

    setSaving(true);

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

    setSaving(false);
  };

  const handleCancel = () => {
    setGender(originalSettings.gender);
    setDistance(originalSettings.distance);
    setMinAge(originalSettings.minAge);
    setMaxAge(originalSettings.maxAge);
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          const result = await logout();
          if (result.success) {
            navigation.navigate('Onboarding');
          } else {
            Alert.alert('Error', result.error || 'Failed to logout. Please try again.');
          }
        },
      },
    ]);
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) => (prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category]));
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.loadingText}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingTop: insets.top, paddingBottom: insets.bottom + 36 }}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={20} color={OnesieColors.navy} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Match Preferences</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.contentBody}>

      <View style={styles.card}>
        <Text style={styles.label}>Interested In</Text>
        <View style={styles.pillRow}>
          {(['male', 'female', 'both'] as const).map((option) => {
            const selected = gender === option;
            return (
              <TouchableOpacity key={option} style={[styles.pill, selected && styles.pillSelected]} onPress={() => setGender(option)}>
                <Text style={[styles.pillText, selected && styles.pillTextSelected]}>
                  {option === 'both' ? 'Everyone' : option[0].toUpperCase() + option.slice(1)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.metricHeader}>
          <Text style={styles.label}>Preferred deal radius</Text>
          <Text style={styles.metricBadge}>{distance} km</Text>
        </View>
        <Slider
          style={styles.slider}
          minimumValue={1}
          maximumValue={50}
          step={1}
          value={distance}
          onValueChange={setDistance}
          minimumTrackTintColor={OnesieColors.teal}
          maximumTrackTintColor="rgba(31,42,68,0.15)"
          thumbTintColor={OnesieColors.teal}
        />

        <Text style={styles.label}>Preferred categories</Text>
        <View style={styles.chipWrap}>
          {categoryOptions.map((category) => {
            const selected = selectedCategories.includes(category);
            return (
              <TouchableOpacity key={category} style={[styles.categoryChip, selected && styles.categoryChipSelected]} onPress={() => toggleCategory(category)}>
                <Text style={[styles.categoryChipText, selected && styles.categoryChipTextSelected]}>{category}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.toggleRowWrap}>
          <View>
            <Text style={styles.toggleTitle}>Open to 2-for-1, 3-for-2 deals</Text>
            <Text style={styles.toggleSub}>Get more variety in your matches</Text>
          </View>
          <Switch value={open2for1} onValueChange={setOpen2for1} />
        </View>

        <View style={styles.metricHeader}>
          <Text style={styles.label}>Age range of swappers</Text>
          <Text style={[styles.metricBadge, styles.metricBadgeCoral]}>{minAge} - {maxAge}</Text>
        </View>
        <RangeSlider
          style={styles.rangeSlider}
          min={18}
          max={80}
          step={1}
          low={minAge}
          high={maxAge}
          floatingLabel
          renderThumb={() => <View style={styles.thumb} />}
          renderRail={() => <View style={styles.rail} />}
          renderRailSelected={() => <View style={styles.railSelected} />}
          renderLabel={(value) => <Text style={styles.rangeLabel}>{String(Math.round(value || 0))}</Text>}
          onValueChanged={(low, high) => {
            setMinAge(Math.round(low));
            setMaxAge(Math.round(high));
          }}
        />
      </View>

      <View style={[styles.card, styles.cardTight]}>
        <View style={styles.toggleRowWrapPlain}>
          <View style={styles.inlineIconWrap}>
            <Ionicons name="notifications-outline" size={18} color={OnesieColors.teal} />
            <View>
              <Text style={styles.toggleTitle}>Push notifications</Text>
              <Text style={styles.toggleSub}>Get alerts for new matches</Text>
            </View>
          </View>
          <Switch value={notifications} onValueChange={setNotifications} />
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.inlineIconWrapStart}>
          <Ionicons name="shield-checkmark-outline" size={20} color={OnesieColors.teal} />
          <Text style={styles.sectionHeader}>Privacy & Safety</Text>
        </View>
        <Text style={styles.safetyItem}>• Block or report users</Text>
        <Text style={styles.safetyItem}>• Control who can see your profile</Text>
        <Text style={styles.safetyItem}>• Manage data & privacy settings</Text>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.saveButton, saving && styles.saveButtonDisabled]} onPress={handleSave} disabled={saving}>
          <Text style={styles.saveButtonText}>{saving ? 'Saving...' : 'Save'}</Text>
        </TouchableOpacity>
      </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={16} color={OnesieColors.coral} />
          <Text style={styles.logoutButtonText}>Log out</Text>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: OnesieColors.white,
    borderBottomWidth: 1,
    borderBottomColor: OnesieColors.borderSoft,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#fff2e8',
    borderWidth: 1,
    borderColor: '#ffd8cf',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    flex: 1,
    marginLeft: 10,
    fontSize: OnesieTypography.h2,
    fontWeight: '900',
    color: OnesieColors.navy,
  },
  headerSpacer: {
    width: 36,
  },
  contentBody: {
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f5dfd6',
    padding: 14,
    marginBottom: 12,
  },
  cardTight: {
    paddingVertical: 10,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    color: OnesieColors.navy,
    marginBottom: 8,
    marginTop: 6,
  },
  metricHeader: {
    marginTop: 8,
    marginBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricBadge: {
    color: OnesieColors.teal,
    backgroundColor: 'rgba(0,196,180,0.1)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    fontSize: 12,
    fontWeight: '700',
  },
  metricBadgeCoral: {
    color: OnesieColors.coral,
    backgroundColor: 'rgba(255,107,94,0.12)',
  },
  slider: {
    width: '100%',
    height: 36,
    marginBottom: 6,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  pill: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#f9fafb',
  },
  pillSelected: {
    backgroundColor: OnesieColors.teal,
    borderColor: OnesieColors.teal,
  },
  pillText: {
    color: OnesieColors.navy,
    fontWeight: '700',
    fontSize: 13,
  },
  pillTextSelected: {
    color: 'white',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(31,42,68,0.08)',
  },
  categoryChipSelected: {
    backgroundColor: OnesieColors.teal,
  },
  categoryChipText: {
    color: OnesieColors.navy,
    fontWeight: '600',
    fontSize: 12,
  },
  categoryChipTextSelected: {
    color: 'white',
  },
  toggleRowWrap: {
    marginTop: 4,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 209, 102, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 209, 102, 0.5)',
    borderRadius: 12,
    padding: 10,
  },
  toggleRowWrapPlain: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toggleTitle: {
    color: OnesieColors.navy,
    fontSize: 14,
    fontWeight: '700',
  },
  toggleSub: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  rangeSlider: {
    width: '100%',
    height: 62,
    marginTop: 8,
  },
  thumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: OnesieColors.coral,
    borderWidth: 2,
    borderColor: OnesieColors.white,
  },
  rail: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
  },
  railSelected: {
    height: 4,
    borderRadius: 2,
    backgroundColor: OnesieColors.coral,
  },
  rangeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: OnesieColors.navy,
    marginTop: 4,
  },
  inlineIconWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inlineIconWrapStart: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionHeader: {
    color: OnesieColors.navy,
    fontSize: 16,
    fontWeight: '800',
  },
  safetyItem: {
    color: '#4b5563',
    fontSize: 13,
    marginBottom: 4,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  saveButton: {
    flex: 1,
    backgroundColor: OnesieColors.coral,
    borderRadius: 12,
    alignItems: 'center',
    paddingVertical: 13,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: OnesieColors.white,
    fontSize: 14,
    fontWeight: '800',
  },
  logoutButton: {
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: OnesieColors.coral,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 12,
  },
  logoutButtonText: {
    color: OnesieColors.coral,
    fontSize: 14,
    fontWeight: '800',
  },
});