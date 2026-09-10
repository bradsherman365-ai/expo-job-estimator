import React, { Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { initializeDatabase } from './src/db/database';

// Screens
import { ContactsScreen } from './src/screens/ContactsScreen';
import { ContactDetailScreen } from './src/screens/ContactDetailScreen';
import { QuoteDetailScreen } from './src/screens/QuoteDetailScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Contact Stack
const ContactsStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen name="ContactsList" component={ContactsScreen} />
    <Stack.Screen 
      name="ContactDetail" 
      component={ContactDetailScreen}
      options={{ animationEnabled: true }}
    />
  </Stack.Navigator>
);

// Quotes Stack
const QuotesStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
    }}
  >
    <Stack.Screen 
      name="QuoteDetail" 
      component={QuoteDetailScreen}
      options={{ animationEnabled: true }}
    />
  </Stack.Navigator>
);

// Bottom Tab Navigator
const RootNavigator = () => (
  <Tab.Navigator
    screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: '#007AFF',
      tabBarInactiveTintColor: '#999',
    }}
  >
    <Tab.Screen
      name="Contacts"
      component={ContactsStack}
      options={{
        tabBarLabel: 'Contacts',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>👥</Text>,
      }}
    />
    <Tab.Screen
      name="Quotes"
      component={QuotesStack}
      options={{
        tabBarLabel: 'Quotes',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📋</Text>,
      }}
    />
    <Tab.Screen
      name="Invoices"
      component={QuotesStack}
      options={{
        tabBarLabel: 'Invoices',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💰</Text>,
      }}
    />
    <Tab.Screen
      name="Settings"
      component={QuotesStack}
      options={{
        tabBarLabel: 'Settings',
        tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
      }}
    />
  </Tab.Navigator>
);

export const AppNavigator = () => {
  return (
    <NavigationContainer>
      <RootNavigator />
    </NavigationContainer>
  );
};
