import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import HomeScreen from "../screens/HomeScreen";
import SubjectListScreen from "../screens/SubjectListScreen";
import TopicsScreen from "../screens/TopicsScreen";
import QuestionsScreen from "../screens/QuestionsScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import SchoolScreen from "../screens/SchoolScreen";
import ContactScreen from "../screens/ContactScreen";
import InviteScreen from "../screens/InviteScreen";

const Stack = createNativeStackNavigator();

const HomeStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="SubjectList" component={SubjectListScreen} />
      <Stack.Screen name="Topics" component={TopicsScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Questions" component={QuestionsScreen} />
      <Stack.Screen name="School" component={SchoolScreen} />
      <Stack.Screen name="Contact" component={ContactScreen} />
      <Stack.Screen name="Invite" component={InviteScreen} />
    </Stack.Navigator>
  );
};

export default HomeStack;
