import React, { useState, useEffect } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, Alert, TouchableOpacity, Modal, Dimensions, FlatList } from 'react-native';
import Swiper from 'react-native-deck-swiper';
import { supabase } from '../supabase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

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

  useEffect(() => {
    fetchDeals();
  }, []);

  const fetchDeals = async () => {
    try {
      // Fetch deals
      const { data: dealsData, error: dealsError } = await supabase
        .from('deals')
        .select('id, merchant_name, time_period_start, time_period_end, deal_nature, terms_conditions')
        .eq('is_active', true);

      if (dealsError) throw dealsError;

      console.log('✅ Fetched deals:', dealsData?.length || 0, 'deals');
      console.log('Deals data:', JSON.stringify(dealsData, null, 2));

      // Fetch deal images
      const { data: imagesData, error: imagesError } = await supabase
        .from('deal_images')
        .select('id, deal_id, path, filename, is_primary');

      if (imagesError) throw imagesError;

      console.log('✅ Fetched images:', imagesData?.length || 0, 'images');
      console.log('Images data:', JSON.stringify(imagesData, null, 2));

      // Combine deals with their primary images
      const dealsWithImages: DealWithImage[] = dealsData?.map((deal: Deal) => {
        const primaryImage = imagesData?.find((img: DealImage) => img.deal_id === deal.id && img.is_primary);
        const allDealImages = imagesData?.filter((img: DealImage) => img.deal_id === deal.id) || [];
        
        const imageUrl = primaryImage
          ? supabase.storage.from('deals_images').getPublicUrl(primaryImage.path).data.publicUrl
          : null;

        const allImageUrls = allDealImages.map(img => 
          supabase.storage.from('deals_images').getPublicUrl(img.path).data.publicUrl
        );

        console.log(`Deal ${deal.merchant_name}:`, {
          dealId: deal.id,
          primaryImage: primaryImage ? primaryImage.path : 'NOT FOUND',
          imageUrl: imageUrl || 'NULL',
          totalImages: allImageUrls.length
        });

        return {
          ...deal,
          imageUrl,
          allImages: allImageUrls,
        };
      }).filter((deal): deal is DealWithImage => deal.imageUrl !== null && deal.imageUrl !== undefined) || [];

      console.log('✅ Final deals with images:', dealsWithImages.length);
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

  const onSwiped = (index: number) => {
    console.log(`Swiped deal ${deals[index]?.merchant_name}`);
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
          onSwiped={onSwiped}
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