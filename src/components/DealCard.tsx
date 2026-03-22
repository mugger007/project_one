import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DealWithImage } from '../services/dealService';
import { OnesieColors, OnesieRadii, OnesieShadow } from '../theme/tokens';

interface DealCardProps {
  deal: DealWithImage;
  onPress: () => void;
}

export default function DealCard({ deal, onPress }: DealCardProps) {
  const startDate = new Date(deal.time_period_start).toLocaleDateString();
  const endDate = new Date(deal.time_period_end).toLocaleDateString();
  const shortDescription = (deal.terms_conditions || 'Great swap opportunity from the community.').trim();

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.92}>
      <View style={styles.imageWrap}>
        <Image source={{ uri: deal.imageUrl }} style={styles.cardImage} />
        <View style={styles.typeChip}>
          <Text style={styles.typeChipText}>{deal.deal_nature}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.merchantName} numberOfLines={2}>{deal.merchant_name}</Text>

        <Text style={styles.description} numberOfLines={2}>{shortDescription}</Text>

        <View style={styles.metaRow}>
          <Ionicons name="time-outline" size={14} color={OnesieColors.mutedNavy} />
          <Text style={styles.metaText}>Valid {startDate} - {endDate} • 2 km away</Text>
        </View>

        <View style={styles.posterRow}>
          <View style={styles.posterIdentity}>
            <View style={styles.avatarStack}>
              <Image
                source={{ uri: deal.imageUrl }}
                style={[styles.avatar, styles.avatarBack]}
              />
              <Image
                source={{ uri: deal.imageUrl }}
                style={styles.avatar}
              />
            </View>
            <Text style={styles.posterName}>Community Member</Text>
            <Ionicons name="checkmark-circle" size={16} color={OnesieColors.teal} />
          </View>
          <Text style={styles.distanceText}>Posted now</Text>
        </View>

        <View style={styles.hintPill}>
          <Ionicons name="chevron-back" size={13} color={OnesieColors.coral} />
          <Text style={styles.hintText}>Swipe left to pass • Swipe right to like</Text>
          <Ionicons name="chevron-forward" size={13} color={OnesieColors.coral} />
        </View>

        <View style={styles.actionRow}>
          <View style={styles.passBtn}>
            <Text style={styles.passBtnText}>Pass</Text>
          </View>
          <View style={styles.likeBtn}>
            <Text style={styles.likeBtnText}>Like Deal</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    // REMOVED: flex: 1 — this was causing the card to expand to the full swiper container height
    borderRadius: OnesieRadii.card,
    backgroundColor: OnesieColors.white,
    overflow: 'hidden',
    ...OnesieShadow,
  },
  imageWrap: {
    width: '100%',
    height: 210, // CHANGED: was '42%' — percentages don't work without a defined parent height
  },
  cardImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  typeChip: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: OnesieColors.coral,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: OnesieRadii.chip,
  },
  typeChipText: {
    color: OnesieColors.white,
    fontSize: 11,
    fontWeight: '700',
  },
  cardContent: {
    padding: 16,
    paddingBottom: 20,
    // REMOVED: flex: 1 — this was stretching the content section and pushing buttons down
  },
  merchantName: {
    fontSize: 22,
    fontWeight: '800',
    color: OnesieColors.navy,
    marginBottom: 6,
  },
  description: {
    color: OnesieColors.mutedNavy,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  metaText: {
    fontSize: 13,
    color: OnesieColors.mutedNavy,
  },
  posterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(31,42,68,0.1)',
    paddingTop: 12,
    marginBottom: 12,
  },
  posterIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  avatarStack: {
    flexDirection: 'row',
    marginRight: 2,
  },
  avatar: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: OnesieColors.white,
    marginLeft: -6,
  },
  avatarBack: {
    opacity: 0.85,
  },
  posterName: {
    fontSize: 12,
    color: OnesieColors.navy,
    fontWeight: '600',
  },
  distanceText: {
    fontSize: 12,
    color: OnesieColors.mutedNavy,
    fontWeight: '600',
  },
  hintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 12,
    backgroundColor: 'rgba(255,107,94,0.12)',
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginBottom: 12,
  },
  hintText: {
    fontSize: 12,
    color: OnesieColors.coral,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  passBtn: {
    flex: 1,
    borderWidth: 2,
    borderColor: OnesieColors.coral,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  passBtnText: {
    color: OnesieColors.coral,
    fontWeight: '700',
    fontSize: 14,
  },
  likeBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    backgroundColor: OnesieColors.teal,
  },
  likeBtnText: {
    color: OnesieColors.white,
    fontWeight: '700',
    fontSize: 14,
  },
});