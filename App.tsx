import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Onboarding from './src/screens/Onboarding';
import DealFeed from './src/screens/DealFeed';
import Matches from './src/screens/Matches';
import Chat from './src/screens/Chat';
import Settings from './src/screens/Settings';
import Profile from './src/screens/Profile';

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NavigationContainer>
          <Tab.Navigator
            screenOptions={({ route }) => ({
              tabBarIcon: ({ focused, color, size }) => {
                let iconName: keyof typeof Ionicons.glyphMap;

                if (route.name === 'Onboarding') {
                  iconName = 'home-outline';
                } else if (route.name === 'DealFeed') {
                  iconName = 'list-outline';
                } else if (route.name === 'Matches') {
                  iconName = 'heart-outline';
                } else if (route.name === 'Chat') {
                  iconName = 'chatbubble-outline';
                } else if (route.name === 'Settings') {
                  iconName = 'settings-outline';
                } else if (route.name === 'Profile') {
                  iconName = 'person-outline';
                } else {
                  iconName = 'home-outline';
                }

                return <Ionicons name={iconName} size={size} color={color} />;
              },
              tabBarActiveTintColor: 'tomato',
              tabBarInactiveTintColor: 'gray',
            })}
          >
            <Tab.Screen name="Onboarding" component={Onboarding} />
            <Tab.Screen name="DealFeed" component={DealFeed} />
            <Tab.Screen name="Matches" component={Matches} />
            <Tab.Screen name="Chat" component={Chat} />
            <Tab.Screen name="Settings" component={Settings} />
            <Tab.Screen name="Profile" component={Profile} />
          </Tab.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
