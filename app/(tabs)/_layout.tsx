import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/ui/TabBar';
import { BackgroundTaskIndicator } from '@/components/ui/BackgroundTaskIndicator';
import { View } from 'react-native';

export default function TabLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Tabs
        tabBar={(props) => <TabBar {...props} />}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="stylist" />
        <Tabs.Screen name="closet" />
        <Tabs.Screen name="profile" />
      </Tabs>
      <BackgroundTaskIndicator />
    </View>
  );
}
