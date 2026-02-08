import React from 'react';
import { Tabs } from 'expo-router';
import { TabBar } from '@/components/ui/TabBar';
import { Colors } from '@/constants/Colors';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="community" />
      <Tabs.Screen name="index" />
      <Tabs.Screen
        name="plus"
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            e.preventDefault();
            navigation.navigate('analyze' as never);
          },
        })}
      />
      <Tabs.Screen name="closet" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}
