import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Modal, Dimensions, FlatList } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { supabase } from '../supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useUserStore } from '../stores/userStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Deal {
  id: string;
  merchant_name: string;
  time_period_start: string;
  time_period_end: string;
  deal_nature: string;
  terms_conditions: string;
}

interface DealImage {
  id: string;
  deal_id: string;
  path: string;
  filename: string;
  is_primary: boolean;
}

interface DealWithImage extends Deal {
  imageUrl?: string;
  allImages?: string[];
}

export default function DealFeed() {
  const [deals, setDeals] = useState<DealWithImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [allSwiped, setAllSwiped] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedDeal, setSelectedDeal] = useState<DealWithImage | null>(null);
  const insets = useSafeAreaInsets();
  const { userId } = useUserStore();

  useEffect(() => {
    fetchDeals();
    if (userId) {
      checkForNewMatches();
    }
  }, [userId]);

  const checkForNewMatches = async () => {
    try {
      // Query matches where current user is user2_id (they were matched by another user's swipe)
      const { data: newMatches, error } = await supabase
        .from('matches')
        .select('id, deal_id, user1_id, user2_id, created_at')
        .eq('user2_id', userId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error checking for new matches:', error);
        return;
      }

      if (newMatches && newMatches.length > 0) {
        const matchCount = newMatches.length;
        const matchText = matchCount === 1 ? 'match' : 'matches';
        
        Alert.alert(
          '🎉 New Matches!',
          `You have ${matchCount} new ${matchText}! Check your Matches tab to see who you connected with.`,
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error in checkForNewMatches:', error);
    }
  };

  const fetchDeals = async () => {
    try {
      // Fetch deals
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select('id, merchant_name, time_period_start, time_period_end, deal_nature, terms_conditions')
        .eq('is_active', true);

      if (dealsError) throw dealsError;

      // Fetch user's previous swipes
      let swipedDealIds: string[] = [];
      if (userId) {
        const { data: swipesData, error: swipesError } = await supabase
          .from('swipes')
          .select('deal_id')
          .eq('user_id', userId);

        if (swipesError) {
          console.error('Error fetching swipes:', swipesError);
        } else {
          swipedDealIds = swipesData?.map(swipe => swipe.deal_id) || [];
        }
      }

      // Filter out already swiped deals
      const unswipedDeals = dealsData?.filter(deal => !swipedDealIds.includes(deal.id)) || [];

      // Fetch deal images
      const { data: imagesData, error: imagesError } = await supabase
        .from('deal_images')
        .select('id, deal_id, path, filename, is_primary');

      if (imagesError) throw imagesError;

      // Combine deals with their primary images
      const dealsWithImages: DealWithImage[] = unswipedDeals?.map((deal: Deal) => {
        const primaryImage = imagesData?.find((img: DealImage) => img.deal_id === deal.id && img.is_primary);
        const allDealImages = imagesData?.filter((img: DealImage) => img.deal_id === deal.id) || [];
        
        const imageUrl = primaryImage
          ? supabase.storage.from('deals_images').getPublicUrl(primaryImage.path).data.publicUrl
          : null;

        const allImageUrls = allDealImages.map(img => 
          supabase.storage.from('deals_images').getPublicUrl(img.path).data.publicUrl
        );

        return {
          ...deal,
          imageUrl,
          allImages: allImageUrls,
        };
      }).filter((deal): deal is DealWithImage => deal.imageUrl !== null && deal.imageUrl !== undefined) || [];


      setDeals(dealsWithImages);
    } catch (error) {
      console.error('❌ Error fetching deals:', error);
      Alert.alert('Error', 'Failed to load deals');
    } finally {
      setLoading(false);
    }
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

  const logSwipe = async (dealId: string, direction: 'left' | 'right') => {
    if (!userId) {
      console.error('No user ID available for swipe logging');
      return;
    }

    try {
      const { error } = await supabase
        .from('swipes')
        .insert({
          user_id: userId,
          deal_id: dealId,
          direction: direction,
        });

      if (error) {
        console.error('Error logging swipe:', error);
      }
    } catch (error) {
      console.error('Error logging swipe:', error);
    }
  };

  const checkForMatch = async (dealId: string) => {
    if (!userId) {
      console.error('No user ID available for match checking');
      return;
    }

    try {
      // Check if another user has also swiped right on the same deal
      const { data: matchingSwipes, error: swipesError } = await supabase
        .from('swipes')
        .select('user_id, created_at')
        .eq('deal_id', dealId)
        .eq('direction', 'right')
        .neq('user_id', userId);

      if (swipesError) {
        console.error('Error checking for matches:', swipesError);
        return;
      }

      if (matchingSwipes && matchingSwipes.length > 0) {
        // Found at least one matching user
        const matchedUserId = matchingSwipes[0].user_id;

        // Insert match into matches table
        const { error: matchError } = await supabase
          .from('matches')
          .insert({
            user1_id: userId,
            user2_id: matchedUserId,
            deal_id: dealId,
          });

        if (matchError) {
          console.error('Error creating match:', matchError);
        } else {
          // Notify the current user
          Alert.alert(
            '🎉 It\'s a Match!',
            'You and another user both liked this deal! Check your Matches to connect.',
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Error in checkForMatch:', error);
    }
  };

  const onSwipedLeft = (index: number) => {
    const deal = deals[index];
    if (deal) {
      logSwipe(deal.id, 'left');
    }
  };

  const onSwipedRight = async (index: number) => {
    const deal = deals[index];
    if (deal) {
      // Wait for swipe to be logged before checking for matches
      await logSwipe(deal.id, 'right');
      
      // Small delay to ensure database transaction is committed
      setTimeout(() => {
        checkForMatch(deal.id);
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