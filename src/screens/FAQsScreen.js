/* eslint-disable react/no-unescaped-entities */
import React, { useState, useMemo } from "react";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Dimensions,
  Platform,
  TextInput,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  interpolate,
  LinearTransition,
  withTiming,
} from "react-native-reanimated";

// Import your actual components
import AppText from "../components/AppText";
import AppHeader from "../components/AppHeader";
import colors from "../helpers/colors";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

// const { width, height } = Dimensions.get("screen");

// FAQ Data organized by categories
const FAQ_DATA = [
  {
    id: "general",
    category: "General",
    icon: "information-circle",
    questions: [
      {
        id: "g1",
        question: "What is Guru EduTech?",
        answer:
          "Guru EduTech is a comprehensive educational platform that helps students learn through interactive quizzes, practice questions, and collaborative learning with friends. Our platform covers various subjects and helps track your progress.",
      },
      {
        id: "g2",
        question: "How do I create an account?",
        answer:
          'To create an account, tap on "Sign Up" on the login screen. You can register as a Student, Teacher, or Professional. Enter your username, email, and password, then follow the prompts to complete your profile.',
      },
      {
        id: "g3",
        question: "What are Guru Tokens (GT)?",
        answer:
          "Guru Tokens (GT) are points you earn by answering questions correctly, maintaining streaks, and completing daily tasks. You can use GT to renew subscriptions, convert to cash, or purchase airtime and data.",
      },
      {
        id: "g4",
        question: "Is my data secure?",
        answer:
          "Yes! We take data security seriously. All your personal information is encrypted and stored securely. We never share your data with third parties without your consent.",
      },
    ],
  },
  {
    id: "subscription",
    category: "Subscription & Payments",
    icon: "card",
    questions: [
      {
        id: "s1",
        question: "How much does a subscription cost?",
        answer:
          "Student subscriptions start at ₦2,000/month, with discounts for longer periods (₦4,000 for 2 months, ₦6,000 for 3 months, up to ₦24,000 for 12 months). School subscriptions are ₦50,000/year. We offer flexible payment plans to suit your needs.",
      },
      {
        id: "s2",
        question: "Can I renew subscription with Guru Tokens?",
        answer:
          "Yes! You can use your earned Guru Tokens to renew your subscription. The conversion rate is 10 GT = ₦1. Simply go to Settings → Renew Subscription to use your points.",
      },
      {
        id: "s3",
        question: "What payment methods are accepted?",
        answer:
          "We accept card payments (Visa, Mastercard), bank transfers, and mobile money. All payments are processed securely through Flutterwave with industry-standard encryption.",
      },
      {
        id: "s4",
        question: "Can I get a refund?",
        answer:
          "Refunds are processed for failed transactions or duplicate payments. Contact support within 7 days of the transaction with your transaction reference for refund requests.",
      },
      {
        id: "s5",
        question: "What happens when my subscription expires?",
        answer:
          "When your subscription expires, you will lose access to premium features like unlimited questions, multiplayer quizzes, and full subject access. You can renew anytime to restore full access.",
      },
    ],
  },
  {
    id: "points",
    category: "Points & Rewards",
    icon: "trophy",
    questions: [
      {
        id: "p1",
        question: "How do I earn points?",
        answer:
          "Earn points by: answering new questions correctly (40 points), answering repeated questions correctly (0.2 points), maintaining daily streaks, completing weekly quotas, and inviting friends. Note: Incorrect answers deduct 15 points.",
      },
      {
        id: "p2",
        question: "What are daily and weekly limits?",
        answer:
          "You can answer up to 100 questions per day, with a maximum of 50 questions per subject. You can practice 2 different subjects per day. These limits reset at midnight daily.",
      },
      {
        id: "p3",
        question: "How do I convert points to cash?",
        answer:
          "Go to Wallet → Withdraw. Enter the amount you want to withdraw (10 GT = ₦1), add your bank account details, and submit. Withdrawals are processed within 24 hours and credited directly to your bank account.",
      },
      {
        id: "p4",
        question: "Can I buy airtime/data with points?",
        answer:
          "Yes! Navigate to Wallet → Recharge (for airtime) or Data. Select your network (MTN, GLO, Airtel, 9Mobile), enter your phone number, choose a bundle, and confirm. Your airtime/data is delivered instantly.",
      },
      {
        id: "p5",
        question: "What are streaks and how do they work?",
        answer:
          "Streaks track consecutive days of activity on the platform. Answer at least one question daily to maintain your streak. Higher streaks unlock special rewards, bonuses, and recognition badges.",
      },
    ],
  },
  {
    id: "quiz",
    category: "Quizzes & Learning",
    icon: "book",
    questions: [
      {
        id: "q1",
        question: "What types of quizzes are available?",
        answer:
          "We offer three types: Solo practice quizzes (individual learning), Multiplayer friend challenges (compete with up to 3 friends), and School assignments (teacher-created tasks). Each type has different point calculations.",
      },
      {
        id: "q2",
        question: "How does multiplayer mode work?",
        answer:
          "Invite up to 3 friends to a quiz session. Each player earns points based on their own answer history - new questions earn full points (40), repeated questions earn 0.2 points. The player with the highest score wins! Points are calculated fairly for each player.",
      },
      {
        id: "q3",
        question: "Can I practice specific topics?",
        answer:
          "Yes! Browse subjects → select a subject → choose specific topics. You can select any combination of topics within your daily limits (100 questions/day, 50 per subject).",
      },
      {
        id: "q4",
        question: "What happens if I answer incorrectly?",
        answer:
          "Incorrect answers deduct 15 points from your score. However, the question is added to your question bank (qBank) so you can review and learn from your mistakes.",
      },
      {
        id: "q5",
        question: "How are quiz points calculated?",
        answer:
          "Points calculation: New correct answer = +40 points, Repeated correct answer = +0.2 points (questions already in your qBank), Wrong answer = -15 points. Your final score is the total of all questions, with a minimum of 0.",
      },
      {
        id: "q6",
        question:
          "What is the difference between Premium and Freemium quizzes?",
        answer:
          "Premium quizzes (for subscribers) offer unlimited questions, multiplayer mode, and all subjects. Freemium quizzes have limited daily questions and restricted subject access.",
      },
    ],
  },
  {
    id: "school",
    category: "Schools & Teachers",
    icon: "school",
    questions: [
      {
        id: "sc1",
        question: "How do students join a school?",
        answer:
          'Search for your school in the app → Tap "Join School" → Wait for teacher verification. Once a verified teacher approves you, you gain access to school assignments, announcements, and the school leaderboard.',
      },
      {
        id: "sc2",
        question: "What can teachers do in the app?",
        answer:
          "Teachers can: create assignments with custom questions, create and conduct live quizzes, post announcements, manage student enrollments, verify students, grade submissions (0-100 scale), publish results, and track class performance analytics.",
      },
      {
        id: "sc3",
        question: "How do assignments work?",
        answer:
          "Teachers create assignments with questions, deadlines, and target classes. Students submit text answers before the deadline. Teachers grade submissions (0-100), where 50+ = passed, below 50 = failed. Results are published to students after all grading is complete.",
      },
      {
        id: "sc4",
        question: "What is the school leaderboard?",
        answer:
          "The school leaderboard ranks all verified students from your school by total points, current points, school points, or streak. Only verified students appear on the leaderboard, encouraging healthy competition.",
      },
      {
        id: "sc5",
        question: "Can teachers create live quiz sessions?",
        answer:
          "Yes! Teachers can create quizzes, start live sessions, and see real-time participation. They can activate quizzes (students can join), set to review mode, show results, or close sessions. Average scores are calculated automatically.",
      },
    ],
  },
  {
    id: "social",
    category: "Friends & Social",
    icon: "people",
    questions: [
      {
        id: "so1",
        question: "How do I add friends?",
        answer:
          'Go to Find Friends → Search for students by name or username → Tap "Follow". When they follow you back, you become "mutuals" and can invite each other to multiplayer quizzes and see each other on your friends list.',
      },
      {
        id: "so2",
        question: "What are friend suggestions based on?",
        answer:
          "Our smart algorithm suggests friends based on: mutual connections (strongest factor), same school/class, same region/state, similar performance levels, recent activity, shared academic interests, and verified school status.",
      },
      {
        id: "so3",
        question: "How do I invite friends to a quiz?",
        answer:
          'Go to Premium Quiz → Select subjects and topics → Choose "Friends" mode → Select up to 3 friends → Send invites. Friends have 24 hours to accept. Once all players join the lobby, the host can start the quiz.',
      },
      {
        id: "so4",
        question: "What are the different leaderboards?",
        answer:
          "There are three leaderboards: Global (all verified students nationwide), School (verified students from your school only), and Professional (content creators). Rankings update in real-time based on points earned.",
      },
      {
        id: "so5",
        question: 'What does "status" mean on friend profiles?',
        answer:
          'Status indicators: "Mutual" (you follow each other), "Following" (you follow them), "Follower" (they follow you), or null (no connection). Mutual friends can invite each other to quizzes.',
      },
    ],
  },
  {
    id: "account",
    category: "Account & Profile",
    icon: "person-circle",
    questions: [
      {
        id: "a1",
        question: "How do I update my profile?",
        answer:
          "Go to Profile → Tap Edit icon → Update your information (first name, last name, prefix, class level, location, gender, avatar) → Save. Note: Email and username cannot be changed for security reasons.",
      },
      {
        id: "a2",
        question: "I forgot my password. What do I do?",
        answer:
          'Tap "Forgot Password" on the login screen → Enter your registered email → Check your inbox for password reset instructions → Click the link and create a new secure password.',
      },
      {
        id: "a3",
        question: "Can I delete my account?",
        answer:
          "Contact support through the app or email with your deletion request. Account deletion is permanent and irreversible - it removes all your data, points, progress, quiz history, and connections.",
      },
      {
        id: "a4",
        question: "How do I change my class level?",
        answer:
          "Go to Profile → Edit → Select new class level → Save. Note: You can change your class level, and the app will remember this was changed. Update your class when you advance to a new level.",
      },
      {
        id: "a5",
        question: "What are the different account types?",
        answer:
          "Student (answer questions, earn points, join schools), Teacher (create assignments, manage students, grade work), Professional (create content, questions, topics), and Manager (oversee professionals and content quality).",
      },
    ],
  },
  {
    id: "wallet",
    category: "Wallet & Payouts",
    icon: "wallet",
    questions: [
      {
        id: "w1",
        question: "How long do withdrawals take?",
        answer:
          "Bank withdrawals are processed within 24 hours on business days. You will receive a notification when your withdrawal is completed. Failed withdrawals are refunded automatically as GT points.",
      },
      {
        id: "w2",
        question: "What are the withdrawal limits?",
        answer:
          "Minimum withdrawal is ₦100 (1,000 GT). There is no maximum limit. Ensure your wallet has sufficient balance - the student wallet must have funds to process your payout.",
      },
      {
        id: "w3",
        question: "Can I view my transaction history?",
        answer:
          "Yes! Go to Profile → Transactions to view all your payment history including subscriptions, withdrawals, airtime purchases, data purchases, and refunds. Each transaction shows date, amount, status, and reference number.",
      },
      {
        id: "w4",
        question: "What if my withdrawal fails?",
        answer:
          "If a withdrawal fails, your points are automatically refunded to your account, and the amount is credited back to the student wallet. You will receive a notification explaining the failure reason. Contact support if issues persist.",
      },
      {
        id: "w5",
        question: "How do I verify my bank account?",
        answer:
          "When making a withdrawal, enter your account number and select your bank. The system automatically verifies your account name in real-time. Ensure the displayed name matches your account to avoid transfer failures.",
      },
    ],
  },
  {
    id: "technical",
    category: "Technical Issues",
    icon: "bug",
    questions: [
      {
        id: "t1",
        question: "The app is running slowly. What can I do?",
        answer:
          "Try these steps: Clear app cache (Settings → Storage), ensure stable internet connection, update to the latest app version from the store, restart your device, or reinstall the app. Contact support if issues persist.",
      },
      {
        id: "t2",
        question: "My payment was deducted but subscription not activated",
        answer:
          'Check Profile → Transactions to verify payment status. If payment shows "completed" but subscription is inactive, tap on the transaction → "Verify Subscription" to activate it. Contact support with transaction reference if problem persists within 24 hours.',
      },
      {
        id: "t3",
        question: "I'm not receiving notifications",
        answer:
          "Check: Device Settings → Notifications → Guru EduTech (ensure enabled). In-app: Settings → Notifications (enable all). Check that notification channels are enabled. For Android, ensure battery optimization is disabled for the app.",
      },
      {
        id: "t4",
        question: "Questions are not loading",
        answer:
          "Check: Internet connection, Daily limits (100 questions/day reached or 50 per subject reached), Subscription status (active?), App version (update if needed). If none apply, try clearing cache or contact support.",
      },
      {
        id: "t5",
        question: "The app crashes when I open it",
        answer:
          "Update the app to the latest version, Clear app data and cache, Restart your device, Reinstall the app (your data is saved on servers), Ensure your device OS is updated. If crashes persist, contact support with your device model.",
      },
    ],
  },
  {
    id: "features",
    category: "Features & Usage",
    icon: "sparkles",
    questions: [
      {
        id: "f1",
        question: "What is the Question Bank (qBank)?",
        answer:
          "Your qBank stores all questions you've attempted (both correct and incorrect). It helps track your learning progress and determines point values - questions already in your qBank earn 0.2 points instead of 40 when answered correctly again.",
      },
      {
        id: "f2",
        question: "How do I track my progress?",
        answer:
          "Go to Profile → Statistics to see: Daily questions answered, Weekly points earned, Total questions attempted, Subject-wise progress, Streak history, Quiz performance stats, Accuracy rates, and Leaderboard rankings.",
      },
      {
        id: "f3",
        question: "What are weekly quotas?",
        answer:
          "Weekly quotas track your activity from Monday-Sunday, recording: Total points earned, Questions answered, Subjects practiced, Daily engagement. Data is saved in quotas history for performance tracking and insights.",
      },
      {
        id: "f4",
        question: "Can I practice offline?",
        answer:
          "No, an internet connection is required to load questions, submit answers, calculate points, sync progress, and access multiplayer features. This ensures data integrity and prevents cheating.",
      },
      {
        id: "f5",
        question: "How are rankings calculated?",
        answer:
          "Rankings are based on: Total Points (primary factor), Current Points (secondary), School Points (for school leaderboard), Streak (tie-breaker). Rankings update in real-time as students earn or spend points.",
      },
    ],
  },
];

// Accordion Item Component with smooth animations
const AccordionItem = ({ item, isExpanded, onToggle }) => {
  const height = useSharedValue(0);
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    height.value = withTiming(isExpanded ? 1 : 0);
    rotation.value = withTiming(isExpanded ? 180 : 0);
  }, [isExpanded]);

  const bodyStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(height.value, [0, 1], [0, 500]),
    opacity: interpolate(height.value, [0, 0.5, 1], [0, 0, 1]),
    overflow: "hidden",
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View layout={LinearTransition} style={styles.accordionItem}>
      <Pressable style={styles.accordionHeader} onPress={onToggle}>
        <View style={{ flex: 1, paddingRight: 10 }}>
          <AppText fontWeight="semibold" size="regular">
            {item.question}
          </AppText>
        </View>
        <Animated.View style={iconStyle}>
          <Ionicons name="chevron-down" size={20} color={colors.primary} />
        </Animated.View>
      </Pressable>
      <Animated.View style={bodyStyle}>
        <View style={styles.accordionBody}>
          <AppText style={styles.answerText} size="small">
            {item.answer}
          </AppText>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// Category Section Component
const CategorySection = ({
  category,
  expandedItems,
  onToggle,
  searchQuery,
}) => {
  const filteredQuestions = useMemo(() => {
    if (!searchQuery) return category.questions;

    const query = searchQuery.toLowerCase();
    return category.questions.filter(
      (q) =>
        q.question.toLowerCase().includes(query) ||
        q.answer.toLowerCase().includes(query)
    );
  }, [category.questions, searchQuery]);

  if (filteredQuestions.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      <View style={styles.categoryHeader}>
        <View style={styles.categoryIconContainer}>
          <Ionicons name={category.icon} size={24} color={colors.primary} />
        </View>
        <AppText fontWeight="bold" size="large" style={styles.categoryTitle}>
          {category.category}
        </AppText>
        <View style={styles.questionCount}>
          <AppText size="xsmall" style={{ color: colors.medium }}>
            {filteredQuestions.length} question
            {filteredQuestions.length !== 1 ? "s" : ""}
          </AppText>
        </View>
      </View>
      {filteredQuestions.map((question) => (
        <AccordionItem
          key={question.id}
          item={question}
          isExpanded={expandedItems.has(question.id)}
          onToggle={() => onToggle(question.id)}
        />
      ))}
    </View>
  );
};

// Main FAQ Screen Component
const FAQScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItems, setExpandedItems] = useState(new Set());
  const [selectedCategory, setSelectedCategory] = useState("general");

  const insets = useSafeAreaInsets();
  const router = useRouter();

  const toggleItem = (id) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredCategories = useMemo(() => {
    if (selectedCategory) {
      return FAQ_DATA.filter((cat) => cat.id === selectedCategory);
    }
    return FAQ_DATA;
  }, [selectedCategory]);

  const totalQuestionsCount = useMemo(() => {
    return filteredCategories.reduce((sum, cat) => {
      const filtered = searchQuery
        ? cat.questions.filter(
            (q) =>
              q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
              q.answer.toLowerCase().includes(searchQuery.toLowerCase())
          )
        : cat.questions;
      return sum + filtered.length;
    }, 0);
  }, [filteredCategories, searchQuery]);

  const expandAll = () => {
    const allIds = new Set();
    filteredCategories.forEach((category) => {
      category.questions.forEach((q) => {
        if (
          !searchQuery ||
          q.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          q.answer.toLowerCase().includes(searchQuery.toLowerCase())
        ) {
          allIds.add(q.id);
        }
      });
    });
    setExpandedItems(allIds);
  };

  const collapseAll = () => {
    setExpandedItems(new Set());
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <AppHeader title="FAQs" />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons
          name="search"
          size={20}
          color={colors.medium}
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search FAQs..."
          placeholderTextColor={colors.medium}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <Pressable onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={colors.medium} />
          </Pressable>
        )}
      </View>

      {/* Results Count */}
      {searchQuery.length > 0 && (
        <View style={styles.resultsCount}>
          <AppText size="small" style={{ color: colors.medium }}>
            Found {totalQuestionsCount} result
            {totalQuestionsCount !== 1 ? "s" : ""} for "{searchQuery}"
          </AppText>
        </View>
      )}

      {/* Category Filters */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          data={[{ id: "all", category: "All", icon: "apps" }, ...FAQ_DATA]}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.filterChip,
                (selectedCategory === item.id ||
                  (selectedCategory === null && item.id === "all")) &&
                  styles.filterChipActive,
              ]}
              onPress={() =>
                setSelectedCategory(item.id === "all" ? null : item.id)
              }
            >
              <Ionicons
                name={item.icon}
                size={16}
                color={
                  selectedCategory === item.id ||
                  (selectedCategory === null && item.id === "all")
                    ? colors.white
                    : colors.primary
                }
              />
              <AppText
                style={[
                  styles.filterChipText,
                  (selectedCategory === item.id ||
                    (selectedCategory === null && item.id === "all")) &&
                    styles.filterChipTextActive,
                ]}
                fontWeight={
                  selectedCategory === item.id ||
                  (selectedCategory === null && item.id === "all")
                    ? "heavy"
                    : "medium"
                }
                size="xsmall"
              >
                {item.category}
              </AppText>
            </Pressable>
          )}
          contentContainerStyle={styles.filterList}
        />
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <Pressable style={styles.actionButton} onPress={expandAll}>
          <MaterialCommunityIcons
            name="arrow-expand-vertical"
            size={16}
            color={colors.primary}
          />
          <AppText
            style={styles.actionButtonText}
            size="xsmall"
            fontWeight="medium"
          >
            Expand All
          </AppText>
        </Pressable>
        <Pressable style={styles.actionButton} onPress={collapseAll}>
          <MaterialCommunityIcons
            name="arrow-collapse-vertical"
            size={16}
            color={colors.primary}
          />
          <AppText
            style={styles.actionButtonText}
            size="xsmall"
            fontWeight="medium"
          >
            Collapse All
          </AppText>
        </Pressable>
      </View>

      {/* FAQ List */}
      <FlatList
        data={filteredCategories}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <CategorySection
            category={item}
            expandedItems={expandedItems}
            onToggle={toggleItem}
            searchQuery={searchQuery}
          />
        )}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="search" size={60} color={colors.light} />
            <AppText
              fontWeight="bold"
              size="large"
              style={{ marginTop: 15, marginBottom: 8 }}
            >
              No results found
            </AppText>
            <AppText
              style={{
                color: colors.medium,
                textAlign: "center",
                paddingHorizontal: 40,
              }}
            >
              Try adjusting your search or filter to find what you're looking
              for
            </AppText>
          </View>
        }
      />

      {/* Contact Support Card */}
      <View style={[styles.supportCard, { bottom: insets.bottom }]}>
        <View style={styles.supportContent}>
          <Ionicons name="help-circle" size={40} color={colors.primary} />
          <View style={styles.supportText}>
            <AppText fontWeight="bold" size="large">
              Still need help?
            </AppText>
            <AppText style={{ color: colors.medium }} size="small">
              Our support team is here to assist you
            </AppText>
          </View>
        </View>
        <Pressable
          style={styles.supportButton}
          onPress={() => router?.push("/main/support")}
        >
          <Ionicons
            name="mail"
            size={18}
            color={colors.white}
            style={{ marginRight: 8 }}
          />
          <AppText style={{ color: colors.white }} fontWeight="semibold">
            Contact Support
          </AppText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.unchange,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 10,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    borderRadius: 12,
    // elevation: 2,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 1 },
    // shadowOpacity: 0.1,
    // shadowRadius: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.black,
    fontFamily: "sf-regular",
  },
  resultsCount: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  filterContainer: {
    marginBottom: 10,
  },
  filterList: {
    paddingHorizontal: 20,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderBottomWidth: 3,
    borderColor: colors.primary,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    marginLeft: 6,
    color: colors.primary,
  },
  filterChipTextActive: {
    color: colors.white,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 15,
    padding: 4,
  },
  actionButtonText: {
    color: colors.primary,
    marginLeft: 4,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 200,
  },
  categorySection: {
    marginBottom: 25,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  categoryTitle: {
    flex: 1,
  },
  questionCount: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.extraLight,
    borderRadius: 12,
  },
  accordionItem: {
    backgroundColor: colors.white,
    borderRadius: 12,
    marginBottom: 10,
    overflow: "hidden",
    // elevation: 2,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: 2 },
    // shadowOpacity: 0.08,
    // shadowRadius: 4,
  },
  accordionHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    minHeight: 60,
  },
  accordionBody: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    paddingTop: 4,
  },
  answerText: {
    color: colors.medium,
    lineHeight: 22,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  supportCard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    boxShadow: `5px 10px 24px ${colors.primary}45`,

    // elevation: 8,
    // shadowColor: "#000",
    // shadowOffset: { width: 0, height: -2 },
    // shadowOpacity: 0.1,
    // shadowRadius: 8,
  },
  supportContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  supportText: {
    marginLeft: 12,
    flex: 1,
  },
  supportButton: {
    backgroundColor: colors.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    // elevation: 2,
  },
});

export default FAQScreen;
