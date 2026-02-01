import React, { useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { GiftedChat, IMessage } from 'react-native-gifted-chat';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../supabase';
import { useUserStore } from '../stores/userStore';

export default function Chat({ route, navigation }: any) {
  const insets = useSafeAreaInsets();
  const { match } = route.params;
  const { userId } = useUserStore();
  
  const [messages, setMessages] = React.useState<IMessage[]>([]);

  useEffect(() => {
    loadMessages();
    subscribeToMessages();
  }, []);

  const loadMessages = async () => {
    console.log('📥 Loading messages for match:', match.id);
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', match.id)
        .order('created_at', { ascending: false });

      console.log('📊 Load messages result:', { data, error, count: data?.length });

      if (error) throw error;

      if (data) {
        const formattedMessages = data.map((msg: any) => ({
          _id: msg.id,
          text: msg.text,
          createdAt: new Date(msg.created_at),
          user: {
            _id: msg.sender_id,
            name: msg.sender_id === userId ? 'You' : match.matchedUserName,
          },
        }));
        console.log('✅ Formatted messages:', formattedMessages.length);
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('❌ Error loading messages:', error);
    }
  };

  const subscribeToMessages = () => {
    console.log('🔔 Subscribing to messages for match:', match.id);
    
    const channel = supabase
      .channel(`match:${match.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `match_id=eq.${match.id}`,
        },
        (payload) => {
          console.log('📨 Received new message via realtime:', payload);
          const newMessage = payload.new as any;
          
          // Only add if not already in messages (prevent duplicates)
          setMessages(prevMessages => {
            const exists = prevMessages.some(msg => msg._id === newMessage.id);
            if (exists) return prevMessages;

            const formattedMessage: IMessage = {
              _id: newMessage.id,
              text: newMessage.text,
              createdAt: new Date(newMessage.created_at),
              user: {
                _id: newMessage.sender_id,
                name: newMessage.sender_id === userId ? 'You' : match.matchedUserName,
              },
            };
            return GiftedChat.append(prevMessages, [formattedMessage]);
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const onSend = useCallback(async (messages: IMessage[] = []) => {
    const message = messages[0];
    
    console.log('📤 Attempting to send message:', {
      match_id: match.id,
      sender_id: userId,
      text: message.text,
      message: message
    });
    
    // Optimistically add message to UI immediately
    setMessages(previousMessages => GiftedChat.append(previousMessages, messages));
    
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          match_id: match.id,
          sender_id: userId,
          text: message.text,
        })
        .select();

      console.log('📊 Supabase insert result:', { data, error });

      if (error) {
        console.error('❌ Error sending message:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
      } else {
        console.log('✅ Message sent successfully:', data);
      }
    } catch (error) {
      console.error('❌ Exception sending message:', error);
    }
  }, [match.id, userId]);

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
          _id: userId || '1',
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