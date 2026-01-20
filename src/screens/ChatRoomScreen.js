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
import {
  selectUser,
  useFetchSingleTicketQuery,
  useSendTicketMessageMutation,
} from "../context/usersSlice";
import { capCapitalize, getFullName, socket } from "../helpers/helperFunctions";
// import Avatar from "../components/Avatar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
const MessageBubble = ({ message, isCurrentUser, category, index }) => {
  const isSupport = message.sender === "support";
  const alignment = isCurrentUser ? "flex-end" : "flex-start";
  const backgroundColor = isCurrentUser ? category?.color : colors.white;
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
      {Boolean(message?.isHeader) && (
        <View>
          <View style={[styles.headerInfo, styles.headerInfoMsg]}>
            <View
              style={[
                styles.headerIcon,
                { backgroundColor: category?.color + "20" },
              ]}
            >
              <Ionicons
                name={category?.icon}
                size={20}
                color={category?.color}
              />
            </View>
            <View>
              <AppText fontWeight="bold" size="regular">
                {category?.title}
              </AppText>
              <View style={styles.statusRow}>
                <AppText size="xsmall" style={{ color: colors.medium }}>
                  {category?.description}
                </AppText>
              </View>
            </View>
          </View>
        </View>
      )}
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
        <AppText
          size="regular"
          fontWeight="medium"
          style={{ color: textColor, lineHeight: 22 }}
        >
          {message.text}
        </AppText>

        {/* Timestamp and Status */}
        <View style={styles.messageFooter}>
          <AppText
            size="xsmall"
            style={{
              color: isCurrentUser ? colors.lighter : colors.medium,
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
                  color={colors.white}
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
  const [typingUser, setTypingUser] = useState(null);
  const [showQuickReplies, setShowQuickReplies] = useState(true);

  const { data, isLoading } = useFetchSingleTicketQuery(params?.ticketId);
  const [sendTicketMessage] = useSendTicketMessageMutation();

  const insets = useSafeAreaInsets();
  const typingTimeoutRef = useRef(null);

  // Extract category info from params
  console.log({ data });

  // Quick replies based on category
  const quickReplies = [
    "I need help with my account",
    "Payment issue",
    "Questions not loading",
    "Cannot withdraw points",
    "Other issue",
  ];

  const formatTime = () => {
    return new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSendMessage = async (text = inputText) => {
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

    try {
      const res = await sendTicketMessage({ text: userMessage?.text }).unwrap();
    } catch (errr) {
      console.log(errr);
    }

    // Send via REST (backend emits socket event)

    // Simulate message sent
    // setTimeout(() => {
    //   setMessages((prev) =>
    //     prev.map((msg) =>
    //       msg.id === userMessage.id
    //         ? { ...msg, status: MessageStatus.SENT }
    //         : msg
    //     )
    //   );
    // }, 500);

    // Simulate delivered
    // setTimeout(() => {
    //   setMessages((prev) =>
    //     prev.map((msg) =>
    //       msg.id === userMessage.id
    //         ? { ...msg, status: MessageStatus.DELIVERED }
    //         : msg
    //     )
    //   );
    // }, 1000);

    // Simulate support typing
    // setTimeout(() => {
    //   setIsTyping(true);
    // }, 1500);

    // Simulate support response
    // setTimeout(() => {
    //   setIsTyping(false);

    //   const supportMessage = {
    //     id: (Date.now() + 1).toString(),
    //     sender: "support",
    //     text: generateSupportResponse(text),
    //     timestamp: formatTime(),
    //     status: MessageStatus.DELIVERED,
    //   };

    //   setMessages((prev) => [...prev, supportMessage]);

    //   // Mark user message as read
    //   setMessages((prev) =>
    //     prev.map((msg) =>
    //       msg.id === userMessage.id
    //         ? { ...msg, status: MessageStatus.READ }
    //         : msg
    //     )
    //   );
    // }, 3500);
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
        category={{
          icon: params?.categoryIcon,
          color: params?.categoryColor,
          description: params?.categoryDescription,
          title: params?.categoryTitle,
        }}
      />
    );
  };

  const handleTyping = (text) => {
    if (!socket) return;

    socket.emit("typing_start", {
      ticketId: params?.ticketId,
      sender: "user",
    });

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", {
        ticketId: params?.ticketId,
        sender: "user",
      });
    }, 1000);
  };

  // new_message
  useEffect(() => {
    socket.on("new_message", ({ message }) => {
      setMessages((prev) => [...prev, message]);
    });

    return () => socket.off("new_message");
  }, []);

  // message_delivered
  useEffect(() => {
    socket.on("message_delivered", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId ? { ...msg, status: "delivered" } : msg
        )
      );
    });

    return () => socket.off("message_delivered");
  }, []);

  // message_read
  useEffect(() => {
    socket.on("message_read", () => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === "user" ? { ...msg, status: "read" } : msg
        )
      );
    });

    return () => socket.off("message_read");
  }, []);

  // typing_start
  useEffect(() => {
    socket.on("typing_start", ({ sender }) => {
      setTypingUser(sender);
    });

    return () => socket.off("typing_start");
  }, []);

  // typing_start
  useEffect(() => {
    socket.on("typing_stop", () => {
      setTypingUser(null);
    });

    return () => socket.off("typing_start");
  }, []);

  // Initialize with welcome message
  // useEffect(() => {
  //   if (categoryData) {
  //     const starterMessage = {
  //       id: "0",
  //       sender: "user",
  //       text: `${categoryData?.subject?.toUpperCase()}\n\n${
  //         categoryData?.message
  //       }`,
  //       timestamp: new Date().toLocaleTimeString("en-US", {
  //         hour: "2-digit",
  //         minute: "2-digit",
  //       }),
  //       category: categoryData?.category,
  //       status: MessageStatus.DELIVERED,
  //     };

  //     setMessages([starterMessage]);
  //     // Simulate support typing
  //     setTimeout(() => {
  //       setIsTyping(true);
  //     }, 1000);

  //     setTimeout(() => {
  //       setIsTyping(false);

  //       const supportMessage = {
  //         id: (Date.now() + 1).toString(),
  //         sender: "support",
  //         text: `Thank you ${capCapitalize(
  //           getFullName(user)
  //         )}.\nWe apologise you're experiencing such issue.\n\nA member of our support team has been notified and will assist you shortly`,
  //         timestamp: formatTime(),
  //         status: MessageStatus.DELIVERED,
  //       };

  //       setMessages((prev) => [...prev, supportMessage]);

  //       // Mark user message as read
  //       setMessages((prev) =>
  //         prev.map((msg) =>
  //           msg.id === "0" ? { ...msg, status: MessageStatus.READ } : msg
  //         )
  //       );
  //     }, 3500);
  //   } else {
  //     const welcomeMessage = {
  //       id: "0",
  //       sender: "support",
  //       text: `Hello ${capCapitalize(
  //         getFullName(user, true)
  //       )}! 👋\n\nThank you for contacting support\n\nHow can we help you today?`,
  //       timestamp: new Date().toLocaleTimeString("en-US", {
  //         hour: "2-digit",
  //         minute: "2-digit",
  //       }),
  //       status: MessageStatus.DELIVERED,
  //     };

  //     setMessages([welcomeMessage]);
  //   }
  // }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  // Load initial messages
  useEffect(() => {
    if (data?.data?.messages) {
      setMessages(data.data.messages);
    }
    socket.emit("join_ticket", params?.ticketId);
  }, [data]);

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
              {
                backgroundColor:
                  params?.categoryColor + "20" ?? colors.primary + "20",
              },
            ]}
          >
            <Ionicons
              name={params?.categoryIcon ?? "chatbubbles"}
              size={20}
              color={params?.categoryColor ?? colors.primary}
            />
          </View>
          <View style={{ flex: 1 }}>
            <AppText fontWeight="bold" size="regular">
              {params?.categoryTitle ?? "Support Chat"}
            </AppText>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <AppText size="xsmall" style={{ color: colors.medium }}>
                Support Team • Online
              </AppText>
            </View>
          </View>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        // keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
        style={{ flex: 1 }}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListFooterComponent={
            <>
              {typingUser === "support" && <TypingIndicator />}
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

        <View
          style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder="Type your message..."
              placeholderTextColor={colors.medium}
              value={inputText}
              onChangeText={(val) => {
                handleTyping();
                setInputText(val);
              }}
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
              color={inputText.trim() ? colors.white : colors.lighter}
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
  headerInfoMsg: {
    flex: null,
    backgroundColor: colors.white,
    padding: 8,
    borderRadius: 8,
    borderTopStartRadius: 30,
    borderBottomLeftRadius: 30,
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
    backgroundColor: colors.green,
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
    fontFamily: "sf-medium",
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
