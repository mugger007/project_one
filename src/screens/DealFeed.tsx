import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Dimensions, FlatList, TextInput, ScrollView, Alert, Animated, Easing } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../stores/userStore';
import { fetchDeals, DealWithImage, createDeal } from '../services/dealService';
import { logSwipe, checkForMatch, checkForNewMatches } from '../services/matchService';
import DealCard from '../components/DealCard';
import { OnesieColors, OnesieTypography } from '../theme/tokens';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DealFeed() {
  const [deals, setDeals] = useState<DealWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [allSwiped, setAllSwiped] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealWithImage | null>(null);
  const [addDealModalVisible, setAddDealModalVisible] = useState(false);
  const [merchantName, setMerchantName] = useState('');
  const [dealNature, setDealNature] = useState('');
  const [termsConditions, setTermsConditions] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startDateValue, setStartDateValue] = useState<Date | null>(null);
  const [endDateValue, setEndDateValue] = useState<Date | null>(null);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [calendarTarget, setCalendarTarget] = useState<'start' | 'end'>('start');
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('Food');
  const [isNegotiable, setIsNegotiable] = useState(false);
  const [meetInPublic, setMeetInPublic] = useState(true);
  const [creatingDeal, setCreatingDeal] = useState(false);
  const fabFloat = useState(new Animated.Value(0))[0];
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { userId } = useUserStore();
  const dealCategories = ['Food', 'Lifestyle', 'Tech', 'Family', 'Other'];

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  const stripTime = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const getCalendarDays = (monthDate: Date) => {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startWeekday = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    const days: Array<Date | null> = [];
    for (let i = 0; i < startWeekday; i += 1) {
      days.push(null);
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      days.push(new Date(year, month, day));
    }
    return days;
  };

  useEffect(() => {
    loadDeals();
    if (userId) {
      checkForNewMatches(userId);
    }
  }, [userId]);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(fabFloat, {
          toValue: -8,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(fabFloat, {
          toValue: 0,
          duration: 850,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [fabFloat]);

  const loadDeals = async () => {
    const dealsWithImages = await fetchDeals(userId);
    setDeals(dealsWithImages);
    setLoading(false);
  };

  const renderCard = (deal: DealWithImage, index: number) => {
    return (
      <DealCard
        deal={deal}
        onPress={() => {
          setSelectedDeal(deal);
          setModalVisible(true);
        }}
      />
    );
  };

  const onSwipedLeft = (index: number) => {
    const deal = deals[index];
    if (deal) logSwipe(userId, deal.id, 'left');
  };

  const onSwipedRight = async (index: number) => {
    const deal = deals[index];
    if (deal) {
      await logSwipe(userId, deal.id, 'right');
      setTimeout(() => checkForMatch(userId, deal.id), 500);
    }
  };

  const onSwipedAll = () => setAllSwiped(true);

  const pickImage = async (fromCamera: boolean) => {
    try {
      let result;
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [4, 3], quality: 1 });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permission is required.');
          return;
        }
        result = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, aspect: [4, 3], quality: 1 });
      }
      if (!result.canceled && result.assets[0]) {
        const uris = result.assets.map((asset) => asset.uri).filter(Boolean);
        setSelectedImages((prev) => Array.from(new Set([...prev, ...uris])).slice(0, 6));
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const resetAddDealForm = () => {
    setMerchantName('');
    setDealNature('');
    setTermsConditions('');
    setStartDate('');
    setEndDate('');
    setStartDateValue(null);
    setEndDateValue(null);
    setCalendarVisible(false);
    setSelectedImages([]);
    setSelectedCategory('Food');
    setIsNegotiable(false);
    setMeetInPublic(true);
    setAddDealModalVisible(false);
  };

  const openCalendar = (target: 'start' | 'end') => {
    setCalendarTarget(target);
    const baseDate = target === 'start' ? startDateValue || new Date() : endDateValue || startDateValue || new Date();
    setCalendarMonth(baseDate);
    setCalendarVisible(true);
  };

  const handleCalendarSelect = (date: Date) => {
    const selected = stripTime(date);
    const today = stripTime(new Date());
    const minEndDate = startDateValue ? stripTime(startDateValue) : today;

    if (calendarTarget === 'start') {
      setStartDateValue(selected);
      setStartDate(formatDate(selected));
      if (endDateValue && stripTime(endDateValue) < selected) {
        setEndDateValue(null);
        setEndDate('');
      }
    } else {
      if (selected < minEndDate) {
        Alert.alert('Invalid date', 'End date cannot be earlier than start date.');
        return;
      }
      setEndDateValue(selected);
      setEndDate(formatDate(selected));
    }
    setCalendarVisible(false);
  };

  const handleAddDeal = async () => {
    if (!userId) { Alert.alert('Error', 'You must be logged in to create a deal.'); return; }
    if (!merchantName.trim() || !dealNature.trim() || !startDate.trim() || !endDate.trim() || selectedImages.length === 0) {
      Alert.alert('Incomplete Form', 'Please fill all fields and select an image.');
      return;
    }
    setCreatingDeal(true);
    const result = await createDeal(userId, merchantName, dealNature, termsConditions, startDate, endDate, selectedImages[0]);
    setCreatingDeal(false);
    if (result.success) {
      Alert.alert('Success', 'Deal created successfully!');
      resetAddDealForm();
      loadDeals();
    } else {
      Alert.alert('Error', result.error || 'Failed to create deal');
    }
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading deals...</Text>
      </View>
    );
  }

  if (deals.length === 0 || allSwiped) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No deals currently available.</Text>
        <Text style={styles.emptySubText}>Please check back later!</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.headerBar, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.brandText}>Onesie</Text>
        <View style={styles.locationPill}>
          <Ionicons name="location-outline" size={14} color={OnesieColors.coral} />
          <Text style={styles.locationText}>Singapore • 2 km</Text>
        </View>
        <TouchableOpacity style={styles.headerIconBtn}>
          <Ionicons name="notifications-outline" size={20} color={OnesieColors.navy} />
        </TouchableOpacity>
      </View>

      <View style={[styles.contentBody, { paddingBottom: tabBarHeight + 12 }]}>
        <View style={styles.swiperViewport}>
          <Swiper
            cards={deals}
            renderCard={renderCard}
            onSwipedLeft={onSwipedLeft}
            onSwipedRight={onSwipedRight}
            onSwipedAll={onSwipedAll}
            cardIndex={0}
            backgroundColor="transparent"
            stackSize={1}
            stackSeparation={0}
            cardHorizontalMargin={24}
            cardVerticalMargin={0}
            marginTop={0}
            marginBottom={0}
            overlayLabels={{
              left: {
                title: 'NOPE',
                style: {
                  label: { backgroundColor: 'red', borderColor: 'red', color: 'white', borderWidth: 1 },
                  wrapper: { flexDirection: 'column', alignItems: 'flex-end', justifyContent: 'flex-start', marginTop: 30, marginLeft: -30 },
                },
              },
              right: {
                title: 'LIKE',
                style: {
                  label: { backgroundColor: 'green', borderColor: 'green', color: 'white', borderWidth: 1 },
                  wrapper: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'flex-start', marginTop: 30, marginLeft: 30 },
                },
              },
            }}
            animateOverlayLabelsOpacity
            animateCardOpacity
          />
        </View>
      </View>

      {/*
        FAB — position:absolute, declared AFTER the swiper in JSX so React Native's
        painter's algorithm draws it on top. The card is now content-sized (no flex:1),
        so it ends well above tabBarHeight + 88, meaning the FAB no longer overlaps
        the "Like Deal" button. zIndex + elevation ensure it renders above the swiper's
        own absolutely positioned card layers.
      */}
      <Animated.View
        style={[
          styles.floatingButton,
          {
            bottom: tabBarHeight + 12,
            transform: [{ translateY: fabFloat }],
          },
        ]}
      >
        <TouchableOpacity
          style={styles.floatingButtonTouchable}
          onPress={() => setAddDealModalVisible(true)}
          activeOpacity={0.9}
        >
          <Ionicons name="sparkles" size={16} color={OnesieColors.yellow} style={styles.fabSparkle} />
          <Ionicons name="add" size={30} color="white" />
        </TouchableOpacity>
      </Animated.View>

      {/* Full Screen Image Modal */}
      <Modal visible={modalVisible} transparent={true} animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
            <Ionicons name="close" size={32} color="white" />
          </TouchableOpacity>
          {selectedDeal && selectedDeal.allImages && (
            <FlatList
              data={selectedDeal.allImages}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <View style={styles.imageSlide}>
                  <Image source={{ uri: item }} style={styles.fullScreenImage} resizeMode="contain" />
                </View>
              )}
            />
          )}
          {selectedDeal && (
            <View style={styles.modalInfo}>
              <Text style={styles.modalMerchantName}>{selectedDeal.merchant_name}</Text>
              <Text style={styles.modalDealNature}>{selectedDeal.deal_nature}</Text>
              <Text style={styles.modalTerms}>{selectedDeal.terms_conditions}</Text>
            </View>
          )}
        </View>
      </Modal>

      {/* Add Deal Modal */}
      <Modal visible={addDealModalVisible} animationType="slide" transparent={false} onRequestClose={() => resetAddDealForm()}>
        <View style={[styles.addDealContainer, { paddingTop: insets.top }]}>
          <View style={styles.addDealHeader}>
            <TouchableOpacity onPress={() => resetAddDealForm()}>
              <Ionicons name="close" size={28} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.addDealTitle}>Add New Deal</Text>
            <View style={{ width: 28 }} />
          </View>
          <ScrollView style={styles.addDealForm}>
            <Text style={styles.label}>Merchant Name *</Text>
            <TextInput style={styles.input} placeholder="Enter merchant name" value={merchantName} onChangeText={setMerchantName} placeholderTextColor="#9CA3AF" />
            <Text style={styles.label}>Deal Nature *</Text>
            <TextInput style={styles.input} placeholder="Describe the deal (e.g., 20% off, Free item)" value={dealNature} onChangeText={setDealNature} placeholderTextColor="#9CA3AF" />
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipRow}>
              {dealCategories.map((category) => {
                const selected = selectedCategory === category;
                return (
                  <TouchableOpacity key={category} onPress={() => setSelectedCategory(category)} style={[styles.chip, selected && styles.chipSelected]}>
                    <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{category}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.toggleContainer}>
              <TouchableOpacity style={[styles.togglePill, isNegotiable && styles.togglePillSelected]} onPress={() => setIsNegotiable((v) => !v)}>
                <Ionicons name="swap-horizontal" size={16} color={isNegotiable ? OnesieColors.white : OnesieColors.navy} />
                <Text style={[styles.toggleText, isNegotiable && styles.toggleTextSelected]}>Negotiable</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.togglePill, meetInPublic && styles.togglePillSelectedTeal]} onPress={() => setMeetInPublic((v) => !v)}>
                <Ionicons name="shield-checkmark" size={16} color={meetInPublic ? OnesieColors.white : OnesieColors.navy} />
                <Text style={[styles.toggleText, meetInPublic && styles.toggleTextSelected]}>Meet in public</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.label}>Terms & Conditions</Text>
            <TextInput style={[styles.input, styles.multilineInput]} placeholder="Enter any terms or conditions" value={termsConditions} onChangeText={setTermsConditions} placeholderTextColor="#9CA3AF" multiline numberOfLines={4} />
            <Text style={styles.label}>Start Date *</Text>
            <TouchableOpacity style={styles.datePickerButton} onPress={() => openCalendar('start')}>
              <Ionicons name="calendar-outline" size={18} color="#374151" />
              <Text style={startDate ? styles.datePickerText : styles.datePickerPlaceholder}>{startDate || 'Select start date'}</Text>
            </TouchableOpacity>
            <Text style={styles.label}>End Date *</Text>
            <TouchableOpacity style={styles.datePickerButton} onPress={() => openCalendar('end')}>
              <Ionicons name="calendar-outline" size={18} color="#374151" />
              <Text style={endDate ? styles.datePickerText : styles.datePickerPlaceholder}>{endDate || 'Select end date'}</Text>
            </TouchableOpacity>
            <Text style={styles.label}>Deal Image *</Text>
            <View style={styles.photoGridWrap}>
              {selectedImages.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.photoCell}>
                  <Image source={{ uri }} style={styles.photoCellImage} />
                  <TouchableOpacity style={styles.photoRemoveBtn} onPress={() => setSelectedImages((prev) => prev.filter((_, i) => i !== index))}>
                    <Ionicons name="close-circle" size={20} color={OnesieColors.coral} />
                  </TouchableOpacity>
                </View>
              ))}
              {selectedImages.length < 6 && (
                <TouchableOpacity style={styles.photoAddCell} onPress={() => pickImage(false)}>
                  <Ionicons name="images-outline" size={22} color={OnesieColors.coral} />
                  <Text style={styles.photoAddText}>Add</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.imageButtonsContainer}>
              <TouchableOpacity style={styles.imageButton} onPress={() => pickImage(true)}>
                <Ionicons name="camera" size={22} color="white" />
                <Text style={styles.imageButtonText}>Take Photo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.imageButtonSecondary} onPress={() => pickImage(false)}>
                <Ionicons name="images" size={22} color={OnesieColors.navy} />
                <Text style={styles.imageButtonSecondaryText}>Gallery</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={[styles.submitButton, creatingDeal && styles.submitButtonDisabled]} onPress={handleAddDeal} disabled={creatingDeal}>
              {creatingDeal ? <ActivityIndicator color="white" /> : <Text style={styles.submitButtonText}>Create Deal</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={calendarVisible} transparent={true} animationType="fade" onRequestClose={() => setCalendarVisible(false)}>
        <View style={styles.calendarOverlay}>
          <View style={styles.calendarCard}>
            <View style={styles.calendarHeader}>
              <TouchableOpacity style={styles.calendarArrow} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() - 1, 1))}>
                <Ionicons name="chevron-back" size={20} color="#1F2937" />
              </TouchableOpacity>
              <Text style={styles.calendarTitle}>{formatMonthYear(calendarMonth)}</Text>
              <TouchableOpacity style={styles.calendarArrow} onPress={() => setCalendarMonth(new Date(calendarMonth.getFullYear(), calendarMonth.getMonth() + 1, 1))}>
                <Ionicons name="chevron-forward" size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>
            <View style={styles.weekdayRow}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={styles.weekdayText}>{day}</Text>
              ))}
            </View>
            <View style={styles.daysGrid}>
              {getCalendarDays(calendarMonth).map((date, index) => {
                if (!date) return <View key={`empty-${index}`} style={styles.dayCell} />;
                const normalized = stripTime(date);
                const selected = calendarTarget === 'start'
                  ? startDateValue && stripTime(startDateValue).getTime() === normalized.getTime()
                  : endDateValue && stripTime(endDateValue).getTime() === normalized.getTime();
                const today = stripTime(new Date());
                const minAllowed = calendarTarget === 'start' ? null : startDateValue ? stripTime(startDateValue) : today;
                const disabled = minAllowed ? normalized < minAllowed : false;
                return (
                  <TouchableOpacity
                    key={`${date.toISOString()}-${index}`}
                    style={[styles.dayCell, selected && styles.dayCellSelected, disabled && styles.dayCellDisabled]}
                    disabled={disabled}
                    onPress={() => handleCalendarSelect(date)}
                  >
                    <Text style={[styles.dayText, selected && styles.dayTextSelected, disabled && styles.dayTextDisabled]}>
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TouchableOpacity style={styles.calendarCloseButton} onPress={() => setCalendarVisible(false)}>
              <Text style={styles.calendarCloseButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: OnesieColors.cream,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: OnesieColors.white,
    borderBottomWidth: 1,
    borderBottomColor: OnesieColors.borderSoft,
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  contentBody: {
    flex: 1,
    paddingTop: 14,
  },
  swiperViewport: {
    flex: 1,
  },
  brandText: {
    fontSize: OnesieTypography.h2,
    fontWeight: '900',
    color: OnesieColors.coral,
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF0E8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  locationText: {
    fontSize: OnesieTypography.caption,
    fontWeight: '600',
    color: OnesieColors.navy,
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OnesieColors.white,
    borderWidth: 1,
    borderColor: OnesieColors.borderSoft,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: OnesieColors.cream,
  },
  swiperContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    height: '85%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: 'hidden',
    alignSelf: 'center',
    width: '95%',
  },
  cardImage: {
    width: '100%',
    height: '75%',
    resizeMode: 'cover',
  },
  cardContent: {
    padding: 20,
    height: '25%',
    justifyContent: 'center',
  },
  merchantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  dateRange: {
    fontSize: 16,
    color: '#6B7280',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: OnesieColors.navy,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: OnesieColors.mutedNavy,
    textAlign: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    padding: 8,
  },
  imageSlide: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: '100%',
  },
  modalInfo: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    padding: 20,
    paddingBottom: 40,
  },
  modalMerchantName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 8,
  },
  modalDealNature: {
    fontSize: 18,
    color: '#FFD700',
    marginBottom: 8,
  },
  modalTerms: {
    fontSize: 14,
    color: '#CCCCCC',
  },
  // FAB: position absolute, declared last in JSX so it paints on top of the swiper.
  // zIndex + elevation beat the swiper's own card layers. bottom: tabBarHeight + 12
  // lands in the gap between the card's bottom edge and the tab bar — no overlap.
  floatingButton: {
    position: 'absolute',
    right: 20,
    width: 68,
    height: 68,
    borderRadius: 34,
    shadowColor: '#ff6b5e',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 9999,
    zIndex: 9999,
  },
  floatingButtonTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 34,
    backgroundColor: OnesieColors.coral,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.45)',
  },
  fabSparkle: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  addDealContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  addDealHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: 'white',
  },
  addDealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
  },
  addDealForm: {
    flex: 1,
    padding: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  chip: {
    backgroundColor: '#fff2e8',
    borderWidth: 1,
    borderColor: '#ffd5cf',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipSelected: {
    backgroundColor: OnesieColors.coral,
    borderColor: OnesieColors.coral,
  },
  chipText: {
    color: OnesieColors.navy,
    fontWeight: '700',
    fontSize: 13,
  },
  chipTextSelected: {
    color: OnesieColors.white,
  },
  toggleContainer: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
    marginBottom: 2,
  },
  togglePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#F9FAFB',
  },
  togglePillSelected: {
    backgroundColor: OnesieColors.coral,
    borderColor: OnesieColors.coral,
  },
  togglePillSelectedTeal: {
    backgroundColor: OnesieColors.teal,
    borderColor: OnesieColors.teal,
  },
  toggleText: {
    color: OnesieColors.navy,
    fontWeight: '700',
    fontSize: 13,
  },
  toggleTextSelected: {
    color: OnesieColors.white,
  },
  datePickerButton: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  datePickerText: {
    fontSize: 14,
    color: '#1F2937',
  },
  datePickerPlaceholder: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  calendarCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  calendarArrow: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  calendarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayText: {
    flex: 1,
    textAlign: 'center',
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.2857%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  dayCellSelected: {
    backgroundColor: '#2563EB',
  },
  dayCellDisabled: {
    opacity: 0.35,
  },
  dayText: {
    fontSize: 14,
    color: '#1F2937',
  },
  dayTextSelected: {
    color: 'white',
    fontWeight: '700',
  },
  dayTextDisabled: {
    color: '#9CA3AF',
  },
  calendarCloseButton: {
    marginTop: 12,
    backgroundColor: '#111827',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
  },
  calendarCloseButtonText: {
    color: 'white',
    fontWeight: '600',
  },
  multilineInput: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  imageButtonsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  imageButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: OnesieColors.teal,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imageButtonSecondary: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    paddingVertical: 12,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imageButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  imageButtonSecondaryText: {
    color: OnesieColors.navy,
    fontSize: 12,
    fontWeight: '700',
  },
  photoGridWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  photoCell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F3F4F6',
  },
  photoCellImage: {
    width: '100%',
    height: '100%',
  },
  photoRemoveBtn: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 999,
  },
  photoAddCell: {
    width: '31%',
    aspectRatio: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ffd5cf',
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff7f3',
  },
  photoAddText: {
    marginTop: 4,
    color: OnesieColors.coral,
    fontWeight: '700',
    fontSize: 12,
  },
  submitButton: {
    backgroundColor: '#10B981',
    borderRadius: 8,
    paddingVertical: 14,
    marginVertical: 20,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});