/* eslint-disable react/no-unescaped-entities */
import React, { useState, useEffect } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Linking,
  RefreshControl,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  interpolate,
  FadeIn,
  FadeInDown,
  SlideInRight,
} from "react-native-reanimated";

// Import your actual components
import AppText from "../components/AppText";
import Screen from "../components/Screen";
import AppButton from "../components/AppButton";
import colors from "../helpers/colors";
import { useSelector } from "react-redux";
import {
  selectUser,
  useCreateSupportTicketMutation,
  useFetchMyTicketsQuery,
} from "../context/usersSlice";
import { getFullName } from "../helpers/helperFunctions";
import Avatar from "../components/Avatar";
import { useRouter } from "expo-router";
import { NavBack } from "../components/AppIcons";
import LottieAnimator from "../components/LottieAnimator";
import PopMessage from "../components/PopMessage";

// Support Categories
const SUPPORT_CATEGORIES = [
  {
    id: "technical",
    title: "Technical Issue",
    icon: "bug",
    color: colors.accent,
    description: "App crashes, loading errors, login issues",
  },
  {
    id: "payment",
    title: "Payment & Billing",
    icon: "card",
    color: "#9C27B0",
    description: "Subscription, refunds, transaction issues",
  },
  {
    id: "account",
    title: "Account Help",
    icon: "person-circle",
    color: "#FF9800",
    description: "Profile, password, verification issues",
  },
  {
    id: "points",
    title: "Points & Rewards",
    icon: "trophy",
    color: "#4CAF50",
    description: "Points not credited, withdrawal issues",
  },
  {
    id: "quiz",
    title: "Quiz & Learning",
    icon: "book",
    color: "#2196F3",
    description: "Questions, answers, quiz problems",
  },
  {
    id: "school",
    title: "School & Teachers",
    icon: "school",
    color: "#00BCD4",
    description: "Verification, assignments, grades",
  },
  {
    id: "other",
    title: "Other",
    icon: "ellipsis-horizontal",
    color: "#607D8B",
    description: "General inquiries and feedback",
  },
];

// Quick Contact Options
const QUICK_CONTACTS = [
  {
    id: "email",
    title: "Email Us",
    subtitle: "support@guruedutech.com",
    icon: "mail",
    color: colors.primary,
    action: () => Linking.openURL("mailto:support@guruedutech.com"),
  },
  {
    id: "phone",
    title: "Call Us",
    subtitle: "+234 815 625 0199",
    icon: "call",
    color: "#FF6B6B",
    action: () => Linking.openURL("tel:+2348156250199"),
  },
  {
    id: "facebook",
    title: "Facebook",
    subtitle: "Reach out to us on our facebook page",
    icon: "logo-facebook",
    color: colors.facebook,
    action: () => Linking.openURL("https://www.facebook.com/young.skillzz.9/"),
  },
];

// Common Issues
const COMMON_ISSUES = [
  {
    id: "1",
    question: "Payment deducted but subscription not active",
    answer:
      'Go to Profile → Transactions → Find your transaction → Tap "Verify Subscription"',
  },
  {
    id: "2",
    question: "Questions not loading",
    answer:
      "Check: Internet connection, Daily limits (100 questions/day), Subscription status",
  },
  {
    id: "3",
    question: "Points not credited after quiz",
    answer:
      "Refresh the app. If issue persists after 5 minutes, contact support with quiz details",
  },
  {
    id: "4",
    question: "Cannot withdraw points",
    answer:
      "Ensure: Minimum 1000 GT (₦100), Correct bank details, Active subscription",
  },
];

// Active Ticket Card Component
const ActiveTicketCard = ({ ticket, onPress, index }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 30 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 30 });
  };

  const lastMessage = ticket.lastMessage || {};
  const unreadCount = ticket.unreadCount || 0;

  const getStatusColor = (status) => {
    switch (status) {
      case "open":
        return "#4CAF50";
      case "in_progress":
        return "#2196F3";
      case "waiting_user":
        return "#FF9800";
      default:
        return colors.medium;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "open":
        return "Open";
      case "in_progress":
        return "In Progress";
      case "waiting_user":
        return "Waiting for you";
      default:
        return status;
    }
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.activeTicketCard}
        >
          <View style={styles.ticketHeader}>
            <View
              style={[
                styles.ticketIcon,
                {
                  backgroundColor:
                    (ticket.categoryColor || colors.primary) + "20",
                },
              ]}
            >
              <Ionicons
                name={ticket.categoryIcon || "help-circle"}
                size={24}
                color={ticket.categoryColor || colors.primary}
              />
            </View>
            <View style={styles.ticketContent}>
              <View style={styles.ticketTitleRow}>
                <AppText fontWeight="bold" size="regular" style={{ flex: 1 }}>
                  {ticket.categoryTitle || "Support Ticket"}
                </AppText>
                {unreadCount > 0 && (
                  <View style={styles.unreadBadge}>
                    <AppText
                      size="xxsmall"
                      fontWeight="bold"
                      style={{ color: colors.white }}
                    >
                      {unreadCount}
                    </AppText>
                  </View>
                )}
              </View>

              <View style={styles.statusBadge}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(ticket.status) },
                  ]}
                />
                <AppText size="xsmall" style={{ color: colors.medium }}>
                  {getStatusText(ticket.status)}
                </AppText>
              </View>

              {ticket.subject && (
                <AppText
                  size="small"
                  style={{ color: colors.medium, marginTop: 4 }}
                  numberOfLines={1}
                >
                  {ticket.subject}
                </AppText>
              )}

              {lastMessage.text && (
                <View style={styles.lastMessageContainer}>
                  <AppText
                    size="xsmall"
                    style={{ color: colors.medium, flex: 1 }}
                    numberOfLines={2}
                  >
                    {lastMessage.sender === "support" ? "Support: " : "You: "}
                    {lastMessage.text}
                  </AppText>
                </View>
              )}

              <AppText
                size="xxsmall"
                style={{ color: colors.medium, marginTop: 4 }}
              >
                {new Date(ticket.lastMessageAt).toLocaleString()}
              </AppText>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.light} />
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// History Ticket Card Component
const HistoryTicketCard = ({ ticket, onPress, index }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.97, { damping: 30 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 30 });
  };

  const categoryData = ticket.categoryData || {};

  return (
    <Animated.View entering={FadeInDown.delay(index * 50).springify()}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.historyTicketCard}
        >
          <View style={styles.historyTicketHeader}>
            <View
              style={[
                styles.historyTicketIcon,
                {
                  backgroundColor:
                    (categoryData.color || colors.primary) + "15",
                },
              ]}
            >
              <Ionicons
                name={categoryData.icon || "help-circle"}
                size={20}
                color={categoryData.color || colors.primary}
              />
            </View>
            <View style={{ flex: 1 }}>
              <AppText fontWeight="semibold" size="regular">
                {ticket.categoryTitle || "Support Ticket"}
              </AppText>
              <AppText
                size="xsmall"
                style={{ color: colors.medium, marginTop: 2 }}
              >
                {new Date(ticket.createdAt).toLocaleDateString()}
              </AppText>
            </View>
            <View style={styles.resolvedBadge}>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.green}
              />
              <AppText
                size="xxsmall"
                fontWeight="semibold"
                style={{ color: colors.green, marginLeft: 4 }}
              >
                Resolved
              </AppText>
            </View>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// Category Card Component
const CategoryCard = ({ item, onPress, index }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 30 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 30 });
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.categoryCard}
        >
          <View
            style={[
              styles.categoryIcon,
              { backgroundColor: item.color + "20" },
            ]}
          >
            <Ionicons name={item.icon} size={28} color={item.color} />
          </View>
          <View style={styles.categoryContent}>
            <AppText
              fontWeight="bold"
              size="regular"
              style={{ marginBottom: 4 }}
            >
              {item.title}
            </AppText>
            <AppText
              size="xsmall"
              style={{ color: colors.medium, lineHeight: 18 }}
            >
              {item.description}
            </AppText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.light} />
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// Quick Contact Card
const QuickContactCard = ({ item, index }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95, { damping: 35 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 35 });
  };

  return (
    <Animated.View entering={SlideInRight.delay(index * 100).springify()}>
      <Animated.View style={[animatedStyle, styles.quickContactCard]}>
        <Pressable
          onPress={item.action}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.quickContactContent}
        >
          <View
            style={[
              styles.quickContactIcon,
              { backgroundColor: item.color + "15" },
            ]}
          >
            <Ionicons name={item.icon} size={24} color={item.color} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText fontWeight="semibold" size="regular">
              {item.title}
            </AppText>
            <AppText
              size="xsmall"
              style={{ color: colors.medium, marginTop: 2 }}
            >
              {item.subtitle}
            </AppText>
          </View>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// Common Issue Item
const CommonIssueItem = ({ item, isExpanded, onToggle }) => {
  const height = useSharedValue(0);
  const rotation = useSharedValue(0);

  React.useEffect(() => {
    height.value = withTiming(isExpanded ? 1 : 0, { duration: 300 });
    rotation.value = withTiming(isExpanded ? 180 : 0, { duration: 300 });
  }, [isExpanded]);

  const bodyStyle = useAnimatedStyle(() => ({
    maxHeight: interpolate(height.value, [0, 1], [0, 200]),
    opacity: interpolate(height.value, [0, 0.5, 1], [0, 0, 1]),
    overflow: "hidden",
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <View style={styles.commonIssueItem}>
      <Pressable style={styles.commonIssueHeader} onPress={onToggle}>
        <MaterialCommunityIcons
          name="lightbulb-on"
          size={18}
          color={colors.warning}
          style={{ marginRight: 10 }}
        />
        <View style={{ flex: 1 }}>
          <AppText fontWeight="medium" size="small">
            {item.question}
          </AppText>
        </View>
        <Animated.View style={iconStyle}>
          <Ionicons name="chevron-down" size={18} color={colors.medium} />
        </Animated.View>
      </Pressable>
      <Animated.View style={bodyStyle}>
        <View style={styles.commonIssueBody}>
          <AppText
            size="xsmall"
            style={{ color: colors.medium, lineHeight: 20 }}
          >
            {item.answer}
          </AppText>
        </View>
      </Animated.View>
    </View>
  );
};

// Contact Form Component
const ContactForm = ({ category, onClose, submitting, onSubmit }) => {
  const user = useSelector(selectUser);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const isValid = subject.trim().length > 3 && message.trim().length > 10;

  const handleSubmit = async () => {
    if (!isValid) return;

    onSubmit({
      category,
      subject,
      message,
      userEmail: user?.email,
      userName: `${user?.firstName} ${user?.lastName}`,
      userId: user?._id,
    });
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.formContainer}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.formHeader}>
          <Pressable onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.medium} />
          </Pressable>
          <View
            style={[
              styles.formCategoryIcon,
              { backgroundColor: category.color + "20" },
            ]}
          >
            <Ionicons name={category.icon} size={32} color={category.color} />
          </View>
          <AppText fontWeight="bold" size="xlarge" style={{ marginTop: 12 }}>
            {category.title}
          </AppText>
          <AppText size="small" style={{ color: colors.medium, marginTop: 4 }}>
            We typically respond within 24 hours
          </AppText>
        </View>

        <View style={styles.formBody}>
          <View style={styles.userInfoCard}>
            <Avatar size={50} source={user?.avatar?.image} />
            <View style={{ marginLeft: 10, flex: 1 }}>
              <AppText size="xsmall" style={{ color: colors.medium }}>
                Sending as
              </AppText>
              <AppText
                fontWeight="semibold"
                style={{ textTransform: "capitalize" }}
                size="large"
              >
                {getFullName(user, true)}
              </AppText>
              <AppText size="xsmall" style={{ color: colors.medium }}>
                {user?.email}
              </AppText>
            </View>
          </View>

          <View style={styles.inputContainer}>
            <AppText
              fontWeight="semibold"
              size="small"
              style={styles.inputLabel}
            >
              Subject *
            </AppText>
            <TextInput
              style={styles.input}
              placeholder="Brief description of your issue"
              placeholderTextColor={colors.medium}
              value={subject}
              onChangeText={setSubject}
              maxLength={100}
            />
            <AppText size="xxsmall" style={styles.charCount}>
              {subject.length}/100
            </AppText>
          </View>

          <View style={styles.inputContainer}>
            <AppText
              fontWeight="semibold"
              size="small"
              style={styles.inputLabel}
            >
              Message *
            </AppText>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Please provide detailed information about your issue..."
              placeholderTextColor={colors.medium}
              value={message}
              onChangeText={setMessage}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
              maxLength={1000}
            />
            <AppText size="xxsmall" style={styles.charCount}>
              {message.length}/1000
            </AppText>
          </View>

          <View style={styles.tipsCard}>
            <MaterialCommunityIcons
              name="information"
              size={18}
              color={colors.primary}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <AppText
                fontWeight="semibold"
                size="xsmall"
                style={{ marginBottom: 4 }}
              >
                Tips for faster resolution:
              </AppText>
              <AppText
                size="xxsmall"
                style={{ color: colors.medium, lineHeight: 18 }}
              >
                • Include transaction reference for payment issues{"\n"}•
                Mention device model for technical issues{"\n"}• Explain in
                details how to reproduce same issue
              </AppText>
            </View>
          </View>

          <AppButton
            title={submitting ? "Sending..." : "Submit Request"}
            onPress={handleSubmit}
            disabled={!isValid || submitting}
            contStyle={{ marginTop: 20, marginBottom: 30 }}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

// Main Contact Support Screen
const ContactSupportScreen = () => {
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [expandedIssue, setExpandedIssue] = useState(null);
  const [activeTab, setActiveTab] = useState("support"); // 'support' or 'history'
  const [refreshing, setRefreshing] = useState(false);
  const [popData, setPopData] = useState({ vis: true });

  const { data: tickets, isLoading, refetch } = useFetchMyTicketsQuery();
  const [createSupportTicket, { isLoading: creating, error: createErr }] =
    useCreateSupportTicketMutation();

  const activeTickets =
    tickets?.data?.tickets?.filter((tick) =>
      ["open", "in_progress", "waiting_user"].includes(tick?.status),
    ) || [];

  const historyTickets =
    tickets?.data?.tickets?.filter((tick) =>
      ["resolved", "closed"].includes(tick?.status),
    ) || [];

  const router = useRouter();

  // Fetch tickets on mount
  useEffect(() => {
    // fetchTickets();
  }, []);

  const fetchTickets = async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }

    try {
      await refetch().unwrap();
    } catch (error) {
      setPopData({
        vis: true,
        type: "failed",
        msg: error?.data?.message ?? "Chat fetch error",
      });
    } finally {
      setRefreshing(false);
    }
  };

  const handleCategorySelect = (category) => {
    setSelectedCategory(category);
  };

  const handleFormSubmit = async (data) => {
    //
    const sendData = {
      category: data?.category?.id,
      categoryIcon: data?.category?.icon,
      categoryColor: data?.category?.color,
      categoryTitle: data?.category?.title,
      categoryDescription: data?.category?.description,
      subject: data?.subject,
      description: data?.message,
    };
    try {
      const res = await createSupportTicket(sendData).unwrap();
      if (res?.success) {
        router.push({
          pathname: "/main/support/chat",
          params: { ...sendData, ticketId: res?.data?._id },
        });
      }
    } catch (errr) {
      setPopData({
        vis: true,
        type: "failed",
        msg: errr?.data?.message ?? "Error creating issue. Try again later",
      });
    }

    // setSelectedCategory(null);
  };

  const handleTicketPress = (ticket) => {
    router.push({
      pathname: "/main/support/chat",
      params: {
        ticketId: ticket._id,
        category: ticket.category || "general",
        categoryTitle: ticket.categoryTitle,
        categoryDescription: ticket?.categoryDescription,
        categoryIcon: ticket?.categoryIcon,
        categoryColor: ticket?.categoryColor,
      },
    });
  };

  const toggleIssue = (id) => {
    setExpandedIssue(expandedIssue === id ? null : id);
  };

  if (selectedCategory) {
    return (
      <Screen style={styles.container}>
        <ContactForm
          category={selectedCategory}
          submitting={creating}
          onClose={() => setSelectedCategory(null)}
          onSubmit={handleFormSubmit}
        />
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <NavBack color="black" style={styles.nav} />
        <Pressable
          style={[styles.tab, activeTab === "support" && styles.activeTab]}
          onPress={() => setActiveTab("support")}
        >
          <AppText
            fontWeight={activeTab === "support" ? "bold" : "medium"}
            size="regular"
            style={{
              color: activeTab === "support" ? colors.primary : colors.medium,
            }}
          >
            Support
          </AppText>
          {activeTickets.length > 0 && (
            <View style={styles.tabBadge}>
              <AppText
                size="xxsmall"
                fontWeight="bold"
                style={{ color: colors.white }}
              >
                {activeTickets.length}
              </AppText>
            </View>
          )}
        </Pressable>

        <Pressable
          style={[styles.tab, activeTab === "history" && styles.activeTab]}
          onPress={() => setActiveTab("history")}
        >
          <AppText
            fontWeight={activeTab === "history" ? "bold" : "medium"}
            size="regular"
            style={{
              color: activeTab === "history" ? colors.primary : colors.medium,
            }}
          >
            History
          </AppText>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchTickets(true)}
          />
        }
      >
        {activeTab === "support" ? (
          <>
            {/* Active Tickets Section */}
            {activeTickets.length > 0 && (
              <View style={styles.section}>
                <AppText
                  fontWeight="bold"
                  size="large"
                  style={styles.sectionTitle}
                >
                  Ongoing Issues
                </AppText>
                {activeTickets.map((ticket, index) => (
                  <ActiveTicketCard
                    key={ticket._id}
                    ticket={ticket}
                    index={index}
                    onPress={() => handleTicketPress(ticket)}
                  />
                ))}
              </View>
            )}

            {/* Header Section */}
            <View style={styles.headerSection}>
              <AppText
                size="regular"
                style={{ color: colors.medium, marginTop: 8, lineHeight: 24 }}
              >
                {activeTickets.length > 0
                  ? "Need more help? Choose a category or use quick contact options"
                  : "Choose a category below or use quick contact options to reach our support team"}
              </AppText>
            </View>

            {/* Quick Contact Options */}
            <View style={styles.section}>
              <AppText
                fontWeight="bold"
                size="large"
                style={styles.sectionTitle}
              >
                Contact Us
              </AppText>
              {QUICK_CONTACTS.map((item, index) => (
                <QuickContactCard key={item.id} item={item} index={index} />
              ))}
            </View>

            {/* Support Categories */}
            <View style={styles.section}>
              <AppText fontWeight="bold" size="large">
                What do you need help with?
              </AppText>
              <AppText
                size="regular"
                style={{
                  color: colors.medium,
                  marginBottom: 15,
                  lineHeight: 24,
                }}
              >
                Select an option to start a live chat with the support team
              </AppText>
              {SUPPORT_CATEGORIES.map((item, index) => (
                <CategoryCard
                  key={item.id}
                  item={item}
                  index={index}
                  onPress={() => handleCategorySelect(item)}
                />
              ))}
            </View>

            {/* Common Issues */}
            <View style={styles.section}>
              <View style={styles.commonIssuesHeader}>
                <MaterialCommunityIcons
                  name="lightbulb-on-outline"
                  size={24}
                  color={colors.warning}
                />
                <AppText
                  fontWeight="bold"
                  size="large"
                  style={{ marginLeft: 8 }}
                >
                  Common Issues
                </AppText>
              </View>
              <AppText
                size="small"
                style={{ color: colors.medium, marginBottom: 15 }}
              >
                Quick solutions to frequently reported problems
              </AppText>
              {COMMON_ISSUES.map((item) => (
                <CommonIssueItem
                  key={item.id}
                  item={item}
                  isExpanded={expandedIssue === item.id}
                  onToggle={() => toggleIssue(item.id)}
                />
              ))}
            </View>

            {/* Response Time Info */}
            <View style={styles.responseTimeCard}>
              <Ionicons name="time" size={24} color={colors.primary} />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <AppText fontWeight="bold" size="regular">
                  Average Response Time
                </AppText>
                <AppText
                  size="small"
                  style={{ color: colors.medium, marginTop: 4 }}
                >
                  We typically respond within 24 hours on business days
                  (Mon-Fri, 9AM-5PM)
                </AppText>
              </View>
            </View>
          </>
        ) : (
          // History Tab Content
          <View style={styles.section}>
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <LottieAnimator visible />
                <AppText
                  size="small"
                  style={{ color: colors.medium, marginTop: 10 }}
                >
                  Loading history...
                </AppText>
              </View>
            ) : historyTickets.length > 0 ? (
              <>
                <AppText
                  fontWeight="bold"
                  size="large"
                  style={styles.sectionTitle}
                >
                  Resolved Tickets
                </AppText>
                <AppText
                  size="small"
                  style={{ color: colors.medium, marginBottom: 15 }}
                >
                  View your previously resolved support tickets
                </AppText>
                {historyTickets.map((ticket, index) => (
                  <HistoryTicketCard
                    key={ticket._id}
                    ticket={ticket}
                    index={index}
                    onPress={() => handleTicketPress(ticket)}
                  />
                ))}
              </>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons
                  name="file-tray-outline"
                  size={64}
                  color={colors.light}
                />
                <AppText
                  fontWeight="semibold"
                  size="large"
                  style={{ marginTop: 16, color: colors.medium }}
                >
                  No History Yet
                </AppText>
                <AppText
                  size="small"
                  style={{
                    color: colors.light,
                    marginTop: 8,
                    textAlign: "center",
                  }}
                >
                  Your resolved support tickets will appear here
                </AppText>
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <PopMessage popData={popData} setPopData={setPopData} />
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingTop: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
    flexDirection: "row",
    justifyContent: "center",
  },
  activeTab: {
    borderBottomColor: colors.primary,
  },
  tabBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    paddingHorizontal: 6,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  headerSection: {
    paddingHorizontal: 20,
    // paddingTop: 10,
    marginBottom: 15,
  },
  section: {
    paddingHorizontal: 20,
    // marginBottom: 10,
  },
  sectionTitle: {
    marginBottom: 15,
  },
  nav: {
    position: "absolute",
    height: "100%",
    paddingHorizontal: 10,
    // backgroundColor: "red",
    marginTop: 8,
    zIndex: 100,
  },
  activeTicketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#007AFF",
    boxShadow: `2px 8px 18px #007AFF25`,
  },
  ticketHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  ticketIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  ticketContent: {
    flex: 1,
  },
  ticketTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  unreadBadge: {
    backgroundColor: "#FF3B30",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  lastMessageContainer: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 10,
    marginTop: 8,
  },
  historyTicketCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
  },
  historyTicketHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  historyTicketIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  resolvedBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  categoryIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  categoryContent: {
    flex: 1,
  },
  quickContactCard: {
    marginBottom: 10,
  },
  quickContactContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
  },
  quickContactIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  commonIssuesHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  commonIssueItem: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginBottom: 8,
    overflow: "hidden",
  },
  commonIssueHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
  },
  commonIssueBody: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    paddingTop: 4,
    paddingLeft: 44,
  },
  responseTimeCard: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },

  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  formContainer: {
    flex: 1,
  },
  formHeader: {
    alignItems: "center",
    paddingTop: 20,
    paddingBottom: 30,
    backgroundColor: "#FFFFFF",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  closeButton: {
    position: "absolute",
    top: 10,
    right: 20,
    padding: 10,
    zIndex: 10,
  },
  formCategoryIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  formBody: {
    padding: 20,
  },
  userInfoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    padding: 14,
    borderRadius: 12,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: "sf-regular",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    color: "#000000",
  },
  textArea: {
    minHeight: 140,
    paddingTop: 14,
  },
  charCount: {
    textAlign: "right",
    color: "#9E9E9E",
    marginTop: 4,
  },
  tipsCard: {
    flexDirection: "row",
    backgroundColor: "#E3F2FD",
    padding: 14,
    borderRadius: 12,
    marginTop: 10,
  },
});

export default ContactSupportScreen;
