import { createNativeStackNavigator } from "@react-navigation/native-stack";
import ProfileScreen from "../screens/ProfileScreen";
import EditProfileScreen from "../screens/EditProfileScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import FriendListScreen from "../screens/FriendListScreen";
import SettingsScreen from "../screens/SettingsScreen";
import InviteScreen from "../screens/InviteScreen";
import InstanceEditScreen from "../screens/InstanceEditScreen";
import InstanceListScreen from "../screens/InstanceListScreen";
import PanelScreen from "../screens/PanelScreen";
import ProListScreen from "../screens/ProListScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";

const Stack = createNativeStackNavigator();

const ProfileStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="FriendList" component={FriendListScreen} />
      <Stack.Screen name="EditProfile" component={EditProfileScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
      <Stack.Screen name="Invite" component={InviteScreen} />
      <Stack.Screen name="ProList" component={ProListScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Panel" component={PanelScreen} />
      <Stack.Screen name="InstanceEdit" component={InstanceEditScreen} />
      <Stack.Screen name="InstanceList" component={InstanceListScreen} />
    </Stack.Navigator>
  );
};

export default ProfileStack;
