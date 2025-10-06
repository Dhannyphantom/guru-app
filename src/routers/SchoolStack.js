import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import SchoolScreen from "../screens/SchoolScreen";
import AssignmentScreen from "../screens/AssignmentScreen";
import NotificationsScreen from "../screens/NotificationsScreen";
import LeaderboardScreen from "../screens/LeaderboardScreen";
import QuizHistoryScreen from "../screens/QuizHistoryScreen";
import CreateSchoolScreen from "../screens/CreateSchoolScreen";
import SchoolDashboardScreen from "../screens/SchoolDashboardScreen";
import VerifyStudentScreen from "../screens/VerifyStudentScreen";
import SubscriptionScreen from "../screens/SubscriptionScreen";
import TeacherQuizScreen from "../screens/TeacherQuizScreen";
import QuizReviewScreen from "../screens/QuizReviewScreen";
import AssignmentReviewScreen from "../screens/AssignmentReviewScreen";
import StudentAssigmentScreen from "../screens/StudentAssigmentScreen";

const Stack = createNativeStackNavigator();

const SchoolStack = () => {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Learn" component={SchoolScreen} />
      <Stack.Screen name="Assignment" component={AssignmentScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
      <Stack.Screen name="QuizHistory" component={QuizHistoryScreen} />
      <Stack.Screen name="CreateSchool" component={CreateSchoolScreen} />
      <Stack.Screen name="SchoolDashboard" component={SchoolDashboardScreen} />
      <Stack.Screen name="VerifyStudent" component={VerifyStudentScreen} />
      <Stack.Screen name="Subscription" component={SubscriptionScreen} />
      <Stack.Screen name="TeacherQuiz" component={TeacherQuizScreen} />
      <Stack.Screen name="QuizReview" component={QuizReviewScreen} />
      <Stack.Screen
        name="AssignmentReview"
        component={AssignmentReviewScreen}
      />
      <Stack.Screen
        name="StudentAssignment"
        component={StudentAssigmentScreen}
      />
    </Stack.Navigator>
  );
};

export default SchoolStack;
