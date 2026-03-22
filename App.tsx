import { StatusBar } from 'expo-status-bar';
import { Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useUserStore } from './src/stores/userStore';
import { supabase } from './src/supabase';
import Onboarding from './src/screens/Onboarding';
import DealFeed from './src/screens/DealFeed';
import Explore from './src/screens/Explore';
import Matches from './src/screens/Matches';
import Chat from './src/screens/Chat';
import Profile from './src/screens/Profile';
import Settings from './src/screens/Settings';
import { OnesieColors, OnesieTypography } from './src/theme/tokens';

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator();
const MatchesStack = createStackNavigator();
const ProfileStack = createStackNavigator();

function MatchesNavigator() {
  return (
    <MatchesStack.Navigator screenOptions={{ headerShown: false }}>
      <MatchesStack.Screen name="MatchesList" component={Matches} />
      <MatchesStack.Screen name="Chat" component={Chat} />
    </MatchesStack.Navigator>
  );
}

function ProfileNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="ProfileMain" component={Profile} />
      <ProfileStack.Screen name="Settings" component={Settings} />
    </ProfileStack.Navigator>
  );
}

function TabNavigator() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: true,
        tabBarLabelStyle: {
          fontSize: OnesieTypography.caption,
          fontWeight: '600',
          marginBottom: 2,
        },
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          if (route.name === 'DealFeed') {
            iconName = focused ? 'swap-horizontal' : 'swap-horizontal-outline';
          } else if (route.name === 'Explore') {
            iconName = focused ? 'compass' : 'compass-outline';
          } else if (route.name === 'Matches') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline';
          } else {
            iconName = 'home-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: OnesieColors.coral,
        tabBarInactiveTintColor: OnesieColors.navy,
        tabBarStyle: {
          backgroundColor: OnesieColors.white,
          borderTopColor: 'rgba(31, 42, 68, 0.10)',
          borderTopWidth: 1,
          paddingTop: 6,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 58 + Math.max(insets.bottom, 8),
        },
      })}
    >
      {/* Updated to match new Figma design v2 - Home/Explore/Matches/Profile tab structure. */}
      <Tab.Screen name="DealFeed" component={DealFeed} options={{ title: 'Home' }} />
      <Tab.Screen name="Explore" component={Explore} />
      <Tab.Screen name="Matches" component={MatchesNavigator} />
      <Tab.Screen name="Profile" component={ProfileNavigator} />
    </Tab.Navigator>
  );
}

export default function App() {
  const userId = useUserStore((state) => state.userId);
  const setUserId = useUserStore((state) => state.setUserId);

  useEffect(() => {
    // Check for existing session on app start
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        setUserId(session.user.id);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (session?.user?.id) {
          setUserId(session.user.id);
        } else {
          setUserId(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [setUserId]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" />
      <SafeAreaProvider>
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {userId ? (
              <Stack.Screen name="MainApp" component={TabNavigator} />
            ) : (
              <Stack.Screen name="Onboarding" component={Onboarding} />
            )}
          </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
