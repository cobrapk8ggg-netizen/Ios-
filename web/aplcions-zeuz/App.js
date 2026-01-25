

import React, { useContext, useEffect } from 'react';
import { NavigationContainer, DarkTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { View, ActivityIndicator } from 'react-native';
import * as Linking from 'expo-linking';

import { AuthProvider, AuthContext } from './src/context/AuthContext';
import { ToastProvider } from './src/context/ToastContext'; // Import ToastProvider

import HomeScreen from './src/screens/HomeScreen';
import LibraryScreen from './src/screens/LibraryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import NovelDetailScreen from './src/screens/NovelDetailScreen';
import ReaderScreen from './src/screens/ReaderScreen';
import CategoryScreen from './src/screens/CategoryScreen';
import SearchScreen from './src/screens/SearchScreen';
import LoginScreen from './src/screens/LoginScreen';
import AdminDashboardScreen from './src/screens/AdminDashboardScreen';
import ManagementScreen from './src/screens/ManagementScreen'; 
import UsersManagementScreen from './src/screens/UsersManagementScreen'; 
import AdminMainScreen from './src/screens/AdminMainScreen'; // New Import
import BulkUploadScreen from './src/screens/BulkUploadScreen'; // New Import for Bulk Upload
import AutoImportScreen from './src/screens/AutoImportScreen'; // 🔥 NEW IMPORT

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0f0f0f',
          borderTopColor: '#2a2a2a',
          borderTopWidth: 1,
          height: 65,
          paddingBottom: 8,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#4a7cc7',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'الرئيسية',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{
          tabBarLabel: 'المكتبة',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="library" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'حسابي',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function NavigationRoot() {
  const { userToken, login, loading } = useContext(AuthContext);

  useEffect(() => {
    const handleDeepLink = (event) => {
      let data = Linking.parse(event.url);
      if (data.path === 'auth' && data.queryParams?.token) {
        login(data.queryParams.token);
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' }}>
        <ActivityIndicator size="large" color="#4a7cc7" />
      </View>
    );
  }

  const appTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: '#4a7cc7',
      background: '#0a0a0a',
      card: '#0f0f0f',
      text: '#fff',
      border: '#2a2a2a',
      notification: '#ff4444',
    },
  };

  return (
    <NavigationContainer theme={appTheme} linking={{ prefixes: [Linking.createURL('/')] }}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
          contentStyle: { backgroundColor: '#0a0a0a' },
        }}
      >
        {userToken ? (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen 
              name="NovelDetail" 
              component={NovelDetailScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen 
              name="Reader" 
              component={ReaderScreen}
              options={{ animation: 'fade' }}
            />
            <Stack.Screen name="Category" component={CategoryScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="Management" component={ManagementScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="UsersManagement" component={UsersManagementScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="AdminMain" component={AdminMainScreen} options={{ animation: 'fade_from_bottom' }} />
            <Stack.Screen name="BulkUpload" component={BulkUploadScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="AutoImport" component={AutoImportScreen} options={{ animation: 'slide_from_bottom' }} /> 
            <Stack.Screen 
              name="UserProfile" 
              component={ProfileScreen} 
              options={{ animation: 'slide_from_right' }} 
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <>
      <StatusBar style="light" backgroundColor="#0a0a0a" />
      <ToastProvider>
        <AuthProvider>
          <NavigationRoot />
        </AuthProvider>
      </ToastProvider>
    </>
  );
}