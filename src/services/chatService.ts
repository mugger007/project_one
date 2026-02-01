import { IMessage } from 'react-native-gifted-chat';
import { supabase } from '../supabase';

export interface ChatMessage {
  id: string;
  match_id: string;
  sender_id: string;
  text: string;
  created_at: string;
}

/**
 * Load all messages for a specific match
 */
export const loadChatMessages = async (
  matchId: string,
  currentUserId: string,
  matchedUserName: string
): Promise<IMessage[]> => {
  const { data, error } = await supabase
    .from('messages')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false });

  if (error) throw error;

  if (!data) return [];

  return data.map((msg: any) => ({
    _id: msg.id,
    text: msg.text,
    createdAt: new Date(msg.created_at),
    user: {
      _id: msg.sender_id,
      name: msg.sender_id === currentUserId ? 'You' : matchedUserName,
    },
  }));
};

/**
 * Send a new message to the database
 */
export const sendChatMessage = async (
  matchId: string,
  senderId: string,
  text: string
): Promise<ChatMessage | null> => {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      match_id: matchId,
      sender_id: senderId,
      text: text,
    })
    .select()
    .single();

  if (error) {
    console.error('Error sending message:', error);
    throw error;
  }

  return data;
};

/**
 * Setup realtime broadcast subscription for a match
 */
export const subscribeToChatMessages = async (
  matchId: string,
  currentUserId: string,
  matchedUserName: string,
  onMessageReceived: (message: IMessage) => void
) => {
  // Set auth before subscribing
  await supabase.realtime.setAuth();

  const channelName = `match:${matchId}:messages`;

  const channel = supabase
    .channel(channelName, { config: { private: true } })
    .on('broadcast', { event: 'INSERT' }, (payload) => {
      const newMessage = payload.payload as any;

      // Validate message has required fields
      if (!newMessage || !newMessage.id || !newMessage.text || !newMessage.sender_id) {
        return;
      }

      // Don't add our own optimistic messages (they're already added)
      if (newMessage.sender_id === currentUserId) {
        return;
      }

      const formattedMessage: IMessage = {
        _id: newMessage.id,
        text: newMessage.text,
        createdAt: new Date(newMessage.created_at || Date.now()),
        user: {
          _id: newMessage.sender_id,
          name: matchedUserName,
        },
      };

      onMessageReceived(formattedMessage);
    })
    .subscribe();

  return { channel, channelName };
};

/**
 * Broadcast a message to other users in the match
 */
export const broadcastMessage = (channel: any, message: ChatMessage) => {
  if (!channel) return;

  channel.send({
    type: 'broadcast',
    event: 'INSERT',
    payload: {
      id: message.id,
      match_id: message.match_id,
      sender_id: message.sender_id,
      text: message.text,
      created_at: message.created_at,
    },
  });
};

/**
 * Unsubscribe from chat channel
 */
export const unsubscribeFromChat = (channel: any) => {
  if (channel) {
    supabase.removeChannel(channel);
  }
};
