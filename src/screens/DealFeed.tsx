import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Modal, Dimensions, FlatList } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { supabase } from '../supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../stores/userStore';
import { fetchDeals, DealWithImage } from '../services/dealService';
import { logSwipe, checkForMatch, checkForNewMatches } from '../services/matchService';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function DealFeed() {
  const [deals, setDeals] = useState<DealWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [allSwiped, setAllSwiped] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealWithImage | null>(null);
  const insets = useSafeAreaInsets();
  const { userId } = useUserStore();

  useEffect(() => {
    loadDeals();
    if (userId) {
      checkForNewMatches(userId);
    }
  }, [userId]);

  const loadDeals = async () => {
    const dealsWithImages = await fetchDeals(userId);
    setDeals(dealsWithImages);
    setLoading(false);
  };

  const renderCard = (deal: DealWithImage, index: number) => {
    const startDate = new Date(deal.time_period_start).toLocaleDateString();
    const endDate = new Date(deal.time_period_end).toLocaleDateString();

    return (
      <TouchableOpacity 
        style={styles.card}
        onPress={() => {
          setSelectedDeal(deal);
          setModalVisible(true);
        }}
        activeOpacity={0.9}
      >
        <Image source={{ uri: deal.imageUrl }} style={styles.cardImage} />
        <View style={styles.cardContent}>
          <Text style={styles.merchantName}>{deal.merchant_name}</Text>
          <Text style={styles.dateRange}>
            Valid: {startDate} - {endDate}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const onSwipedLeft = (index: number) => {
    const deal = deals[index];
    if (deal) {
      logSwipe(userId, deal.id, 'left');
    }
  };

  const onSwipedRight = async (index: number) => {
    const deal = deals[index];
    if (deal) {
      // Wait for swipe to be logged before checking for matches
      await logSwipe(userId, deal.id, 'right');
      
      // Small delay to ensure database transaction is committed
      setTimeout(() => {
        checkForMatch(userId, deal.id);
      }, 500);
    }
  };

  const onSwipedAll = () => {
    setAllSwiped(true);
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
    <View style={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
      <View style={styles.swiperContainer}>
        <Swiper
          cards={deals}
          renderCard={renderCard}
          onSwipedLeft={onSwipedLeft}
          onSwipedRight={onSwipedRight}
          onSwipedAll={onSwipedAll}
          cardIndex={0}
          backgroundColor="transparent"
          stackSize={3}
          stackSeparation={15}
          overlayLabels={{
            left: {
              title: 'NOPE',
              style: {
                label: {
                  backgroundColor: 'red',
                  borderColor: 'red',
                  color: 'white',
                  borderWidth: 1,
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-end',
                  justifyContent: 'flex-start',
                  marginTop: 30,
                  marginLeft: -30,
                },
              },
            },
            right: {
              title: 'LIKE',
              style: {
                label: {
                  backgroundColor: 'green',
                  borderColor: 'green',
                  color: 'white',
                  borderWidth: 1,
                },
                wrapper: {
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  justifyContent: 'flex-start',
                  marginTop: 30,
                  marginLeft: 30,
                },
              },
            },
          }}
          animateOverlayLabelsOpacity
          animateCardOpacity
        />
      </View>

      {/* Full Screen Image Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <TouchableOpacity 
            style={styles.closeButton}
            onPress={() => setModalVisible(false)}
          >
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
                  <Image 
                    source={{ uri: item }} 
                    style={styles.fullScreenImage}
                    resizeMode="contain"
                  />
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 10,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  swiperContainer: {
    flex: 1,
  },
  card: {
    height: '85%',
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 16,
    color: '#6B7280',
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
});