import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import TabRouter from "./TabRouter";
import CreateScreen from "../screens/CreateScreen";
import NewQuizScreen from "../screens/NewQuizScreen";
import SolveScreen from "../screens/SolveScreen";
import SchoolDashboardScreen from "../screens/SchoolDashboardScreen";
import AssignmentReviewScreen from "../screens/AssignmentReviewScreen";
import StudentAssigmentScreen from "../screens/StudentAssigmentScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import VerifyStudentScreen from "../screens/VerifyStudentScreen";
import ProScreen from "../screens/ProScreen";
import InstanceEditScreen from "../screens/InstanceEditScreen";
import InstanceListScreen from "../screens/InstanceListScreen";
import PanelScreen from "../screens/PanelScreen";
import ProListScreen from "../screens/ProListScreen";
import AnalyticsScreen from "../screens/AnalyticsScreen";
// import QuizScreen from "../screens/QuizScreen";
// import QuizStack from "./QuizStack";

const Stack = createNativeStackNavigator();

// SCREENS HERE WILL NOT DISPLAY THE BOTTOM TABS

const HomeRouter = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tab" component={TabRouter} />
      <Stack.Screen name="Create" component={CreateScreen} />
      <Stack.Screen name="NewQuiz" component={NewQuizScreen} />
      <Stack.Screen name="Solve" component={SolveScreen} />
      <Stack.Screen name="Dashboard" component={SchoolDashboardScreen} />
      <Stack.Screen name="Pro" component={ProScreen} />
      <Stack.Screen name="ProList" component={ProListScreen} />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} />
      <Stack.Screen name="Panel" component={PanelScreen} />
      <Stack.Screen name="InstanceEdit" component={InstanceEditScreen} />
      <Stack.Screen name="InstanceList" component={InstanceListScreen} />
      <Stack.Screen
        name="AssignmentReview"
        component={AssignmentReviewScreen}
      />
      <Stack.Screen
        name="StudentAssignment"
        component={StudentAssigmentScreen}
      />
      <Stack.Screen name="VerifyStudent" component={VerifyStudentScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />

      {/* <Stack.Screen name="QuizStack" component={QuizStack} /> */}
    </Stack.Navigator>
  );
};

export default HomeRouter;
