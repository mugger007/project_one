import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function Chat({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { match } = route.params;
  
  const [messages, setMessages] = React.useState<IMessage[]>([
    {
      _id: 1,
      text: 'Hello!',
      createdAt: new Date(),
      user: {
        _id: 2,
        name: match.matchedUserName,
        avatar: 'https://placeimg.com/140/140/any',
      },
    },
  ]);

  const onSend = (messages: IMessage[] = []) => {
    setMessages(previousMessages => GiftedChat.append(previousMessages, messages));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Custom Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#1F2937" />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          {match.dealImageUrl ? (
            <Image 
              source={{ uri: match.dealImageUrl }} 
              style={styles.headerImage}
            />
          ) : (
            <View style={[styles.headerImage, styles.placeholderImage]}>
              <Text style={styles.placeholderText}>?</Text>
            </View>
          )}
          <View style={styles.headerText}>
            <Text style={styles.dealName} numberOfLines={1}>{match.dealName}</Text>
            <Text style={styles.userName} numberOfLines={1}>{match.matchedUserName}</Text>
          </View>
        </View>
      </View>
      
      <GiftedChat
        messages={messages}
        onSend={onSend}
        user={{
          _id: 1,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  headerText: {
    flex: 1,
  },
  dealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 2,
  },
  userName: {
    fontSize: 14,
    color: '#6B7280',
  },
});