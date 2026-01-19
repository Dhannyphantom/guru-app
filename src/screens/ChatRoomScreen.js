import React, { useState, useRef, useEffect } from "react";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  // Dimensions,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  FadeInDown,
  SlideInLeft,
  SlideInRight,
  LinearTransition,
} from "react-native-reanimated";

// Import your actual components
import AppText from "../components/AppText";
import Screen from "../components/Screen";
import colors from "../helpers/colors";
import { useSelector } from "react-redux";
import { selectUser } from "../context/usersSlice";
import { getFullName } from "../helpers/helperFunctions";
// import Avatar from "../components/Avatar";
import { useLocalSearchParams, useRouter } from "expo-router";

// const { width, height } = Dimensions.get("screen");

// Message status enum
const MessageStatus = {
  SENDING: "sending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
};

// Message Component
const MessageBubble = ({ message, isCurrentUser, index }) => {
  const isSupport = message.sender === "support";
  const alignment = isCurrentUser ? "flex-end" : "flex-start";
  const backgroundColor = isCurrentUser ? colors.primary : colors.white;
  const textColor = isCurrentUser ? colors.white : colors.black;
  const enterAnimation = isCurrentUser
    ? SlideInRight.delay(index * 50).springify()
    : SlideInLeft.delay(index * 50).springify();

  return (
    <Animated.View
      entering={enterAnimation}
      layout={LinearTransition.springify()}
      style={[styles.messageContainer, { alignItems: alignment }]}
    >
      <View style={[styles.messageBubble, { backgroundColor }]}>
        {/* Support Badge */}
        {isSupport && (
          <View style={styles.supportBadge}>
            <MaterialCommunityIcons
              name="shield-check"
              size={12}
              color={colors.success}
            />
            <AppText
              size="xxsmall"
              fontWeight="semibold"
              style={{ color: colors.success, marginLeft: 4 }}
            >
              Support Team
            </AppText>
          </View>
        )}

        {/* Message Text */}
        <AppText size="regular" style={{ color: textColor, lineHeight: 22 }}>
          {message.text}
        </AppText>

        {/* Timestamp and Status */}
        <View style={styles.messageFooter}>
          <AppText
            size="xxsmall"
            style={{
              color: isCurrentUser ? colors.white + "CC" : colors.medium,
              marginTop: 4,
            }}
          >
            {message.timestamp}
          </AppText>

          {/* Status Indicator for user messages */}
          {isCurrentUser && (
            <View style={styles.statusContainer}>
              {message.status === MessageStatus.SENDING && (
                <ActivityIndicator size="small" color={colors.white} />
              )}
              {message.status === MessageStatus.SENT && (
                <Ionicons name="checkmark" size={14} color={colors.white} />
              )}
              {message.status === MessageStatus.DELIVERED && (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={colors.white}
                />
              )}
              {message.status === MessageStatus.READ && (
                <Ionicons
                  name="checkmark-done"
                  size={14}
                  color={colors.accent}
                />
              )}
              {message.status === MessageStatus.FAILED && (
                <Ionicons name="alert-circle" size={14} color={colors.heart} />
              )}
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
};

// Typing Indicator Component
const TypingIndicator = () => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    const animate = () => {
      dot1.value = withSpring(1, { duration: 400 }, () => {
        dot1.value = withSpring(0, { duration: 400 });
      });

      setTimeout(() => {
        dot2.value = withSpring(1, { duration: 400 }, () => {
          dot2.value = withSpring(0, { duration: 400 });
        });
      }, 200);

      setTimeout(() => {
        dot3.value = withSpring(1, { duration: 400 }, () => {
          dot3.value = withSpring(0, { duration: 400 });
        });
      }, 400);
    };

    const interval = setInterval(animate, 1200);
    return () => clearInterval(interval);
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: 0.3 + dot1.value * 0.7,
    transform: [{ translateY: -dot1.value * 3 }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: 0.3 + dot2.value * 0.7,
    transform: [{ translateY: -dot2.value * 3 }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: 0.3 + dot3.value * 0.7,
    transform: [{ translateY: -dot3.value * 3 }],
  }));

  return (
    <Animated.View entering={FadeIn} style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, dot1Style]} />
        <Animated.View style={[styles.typingDot, dot2Style]} />
        <Animated.View style={[styles.typingDot, dot3Style]} />
      </View>
    </Animated.View>
  );
};

// Quick Reply Component
const QuickReply = ({ text, onPress, index }) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.95);
  };

  const handlePressOut = () => {
    scale.value = withSpring(1);
  };

  return (
    <Animated.View entering={FadeInDown.delay(index * 100).springify()}>
      <Animated.View style={animatedStyle}>
        <Pressable
          onPress={onPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.quickReplyButton}
        >
          <AppText
            size="small"
            fontWeight="medium"
            style={{ color: colors.primary }}
          >
            {text}
          </AppText>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
};

// Main ChatRoom Screen
const ChatRoomScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const user = useSelector(selectUser);
  const flatListRef = useRef(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  // Extract category info from params
  const categoryTitle = params?.categoryTitle || "Support Chat";
  const categoryDescription = params?.categoryDescription || "";
  const categoryIcon = params?.categoryIcon || "chatbubbles";
  const categoryColor = params?.categoryColor || colors.primary;

  // Quick replies based on category
  const quickReplies = [
    "I need help with my account",
    "Payment issue",
    "Questions not loading",
    "Cannot withdraw points",
    "Other issue",
  ];

  // Initialize with welcome message
  useEffect(() => {
    const welcomeMessage = {
      id: "0",
      sender: "support",
      text: `Hello ${getFullName(
        user,
        true
      )}! 👋\n\nThank you for contacting support regarding "${categoryTitle}".\n\n${categoryDescription}\n\nHow can we help you today?`,
      timestamp: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: MessageStatus.DELIVERED,
    };

    setMessages([welcomeMessage]);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const formatTime = () => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendMessage = (text = inputText) => {
    if (!text.trim()) return;

    // Hide quick replies after first message
    setShowQuickReplies(false);

    // Create user message
    const userMessage = {
      id: Date.now().toString(),
      sender: "user",
      text: text.trim(),
      timestamp: formatTime(),
      status: MessageStatus.SENDING,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");

    // Simulate message sent
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id
            ? { ...msg, status: MessageStatus.SENT }
            : msg
        )
      );
    }, 500);

    // Simulate delivered
    setTimeout(() => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id
            ? { ...msg, status: MessageStatus.DELIVERED }
            : msg
        )
      );
    }, 1000);

    // Simulate support typing
    setTimeout(() => {
      setIsTyping(true);
    }, 1500);

    // Simulate support response
    setTimeout(() => {
      setIsTyping(false);

      const supportMessage = {
        id: (Date.now() + 1).toString(),
        sender: "support",
        text: generateSupportResponse(text),
        timestamp: formatTime(),
        status: MessageStatus.DELIVERED,
      };

      setMessages((prev) => [...prev, supportMessage]);

      // Mark user message as read
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id
            ? { ...msg, status: MessageStatus.READ }
            : msg
        )
      );
    }, 3500);
  };

  const generateSupportResponse = (userText) => {
    const lowerText = userText.toLowerCase();

    if (lowerText.includes("payment") || lowerText.includes("subscription")) {
      return "I understand you're having payment issues. Let me help you with that.\n\nCould you please provide:\n1. Your transaction reference\n2. The date of the transaction\n3. The amount charged\n\nThis will help me investigate and resolve the issue quickly.";
    } else if (lowerText.includes("points") || lowerText.includes("withdraw")) {
      return "I can help with your points and withdrawal concerns.\n\nPlease note:\n• Minimum withdrawal is 1000 GT (₦100)\n• Ensure your bank details are correct\n• Withdrawals process within 24 hours\n\nWhat specific issue are you experiencing?";
    } else if (
      lowerText.includes("question") ||
      lowerText.includes("loading")
    ) {
      return "If questions aren't loading, please check:\n\n1. Your internet connection\n2. Daily limits (100 questions/day)\n3. Your subscription status\n4. App version (update if needed)\n\nHave you checked these already?";
    } else if (lowerText.includes("account") || lowerText.includes("profile")) {
      return "I'm here to help with your account.\n\nWhat specifically do you need help with?\n• Reset password\n• Update profile\n• Verification issues\n• Other account concerns";
    } else {
      return "Thank you for providing more details. A member of our support team has been notified and will assist you shortly.\n\nIn the meantime, is there anything else I can help you with?";
    }
  };

  const handleQuickReply = (reply) => {
    handleSendMessage(reply);
  };

  const renderMessage = ({ item, index }) => {
    const isCurrentUser = item.sender === "user";
    return (
      <MessageBubble
        message={item}
        isCurrentUser={isCurrentUser}
        index={index}
      />
    );
  };

  return (
    <Screen style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.black} />
        </Pressable>

        <View style={styles.headerInfo}>
          <View
            style={[
              styles.headerIcon,
              { backgroundColor: categoryColor + "20" },
            ]}
          >
            <Ionicons name={categoryIcon} size={20} color={categoryColor} />
          </View>
          <View style={{ flex: 1 }}>
            <AppText fontWeight="bold" size="regular">
              {categoryTitle}
            </AppText>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <AppText size="xsmall" style={{ color: colors.medium }}>
                Support Team • Online
              </AppText>
            </View>
          </View>
        </View>

        <Pressable style={styles.headerButton}>
          <Ionicons name="ellipsis-vertical" size={20} color={colors.medium} />
        </Pressable>
      </View>

      {/* Messages List */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={renderMessage}
        contentContainerStyle={styles.messagesList}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        ListFooterComponent={
          <>
            {isTyping && <TypingIndicator />}
            {showQuickReplies && messages.length === 1 && (
              <View style={styles.quickRepliesContainer}>
                <AppText
                  size="xsmall"
                  fontWeight="semibold"
                  style={{ color: colors.medium, marginBottom: 10 }}
                >
                  Quick Replies:
                </AppText>
                {quickReplies.map((reply, index) => (
                  <QuickReply
                    key={index}
                    text={reply}
                    index={index}
                    onPress={() => handleQuickReply(reply)}
                  />
                ))}
              </View>
            )}
          </>
        }
      />

      {/* Input Area */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <Pressable style={styles.attachButton}>
            <Ionicons name="add-circle" size={28} color={colors.primary} />
          </Pressable>

          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor={colors.medium}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
          </View>

          <Pressable
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim()}
            style={[
              styles.sendButton,
              !inputText.trim() && styles.sendButtonDisabled,
            ]}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? colors.white : colors.light}
            />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.unchange,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.extraLight,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 2,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  headerButton: {
    padding: 8,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 100,
  },
  messageContainer: {
    marginBottom: 12,
  },
  messageBubble: {
    maxWidth: "75%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  supportBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.extraLight,
  },
  messageFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  statusContainer: {
    marginLeft: 8,
    marginTop: 4,
  },
  typingContainer: {
    alignItems: "flex-start",
    marginBottom: 12,
  },
  typingBubble: {
    flexDirection: "row",
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    elevation: 1,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.medium,
    marginHorizontal: 2,
  },
  quickRepliesContainer: {
    marginTop: 20,
    marginBottom: 10,
  },
  quickReplyButton: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    backgroundColor: colors.white,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.extraLight,
  },
  attachButton: {
    padding: 6,
    marginRight: 8,
  },
  inputWrapper: {
    flex: 1,
    backgroundColor: colors.unchange,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    maxHeight: 100,
  },
  input: {
    fontSize: 16,
    fontFamily: "sf-regular",
    color: colors.black,
    minHeight: 40,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  sendButtonDisabled: {
    backgroundColor: colors.extraLight,
  },
});

export default ChatRoomScreen;
