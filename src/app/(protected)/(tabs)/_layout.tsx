import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="(home)" options={{ tabBarLabel: "Home" }} />
      <Tabs.Screen
        name="leaderboard"
        options={{ tabBarLabel: "Leaderboard" }}
      />
      <Tabs.Screen name="school" options={{ tabBarLabel: "School" }} />
      <Tabs.Screen name="profile" options={{ tabBarLabel: "Profile" }} />
    </Tabs>
  );
}
