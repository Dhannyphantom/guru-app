import React, { useState, useRef, useEffect } from "react";
import {
  View,
  FlatList,
  Pressable,
  StyleSheet,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Modal,
  ScrollView,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  FadeIn,
  SlideInLeft,
  SlideInRight,
  LinearTransition,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from "react-native-reanimated";

import AppText from "../components/AppText";
import Screen from "../components/Screen";
import AppButton from "../components/AppButton";
import colors from "../helpers/colors";
import { useSelector } from "react-redux";
import {
  selectUser,
  useFetchSingleTicketQuery,
  useSendTicketMessageMutation,
  useAdminReplyTicketMutation,
  useUpdateTicketStatusMutation,
  useUpdateTicketPriorityMutation,
  // useAssignTicketMutation,
} from "../context/usersSlice";
import { capCapitalize, getFullName, socket } from "../helpers/helperFunctions";
import Avatar from "../components/Avatar";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import LottieAnimator from "../components/LottieAnimator";
import getRefresher from "../components/Refresher";
import PopAlerts from "../components/PopAlerts";

const MessageStatus = {
  SENDING: "sending",
  SENT: "sent",
  DELIVERED: "delivered",
  READ: "read",
  FAILED: "failed",
};

const statusOptions = [
  { value: "open", label: "Open", color: "#4CAF50", icon: "mail-open" },
  {
    value: "in_progress",
    label: "In Progress",
    color: "#2196F3",
    icon: "time",
  },
  {
    value: "waiting_user",
    label: "Waiting User",
    color: "#FF9800",
    icon: "hourglass",
  },
  {
    value: "resolved",
    label: "Resolved",
    color: "#4CAF50",
    icon: "checkmark-circle",
  },
  {
    value: "closed",
    label: "Closed",
    color: "#9E9E9E",
    icon: "close-circle",
  },
];

const priorityOptions = [
  { value: "low", label: "Low", color: "#4CAF50", icon: "arrow-down" },
  { value: "medium", label: "Medium", color: "#2196F3", icon: "remove" },
  { value: "high", label: "High", color: "#FF9800", icon: "arrow-up" },
  { value: "urgent", label: "Urgent", color: "#F44336", icon: "warning" },
];

// Message Component
const MessageBubble = ({ message, isCurrentUser, category, index }) => {
  const isSupport = message.sender === "support";
  const isSystem = message.sender === "system";
  const alignment = isCurrentUser ? "flex-end" : "flex-start";

  let backgroundColor;
  if (isSystem) {
    backgroundColor = "#E3F2FD";
  } else if (isCurrentUser) {
    backgroundColor = category?.color || colors.primary;
  } else {
    backgroundColor = colors.white;
  }

  const textColor = isCurrentUser && !isSystem ? colors.white : colors.black;
  const enterAnimation = isCurrentUser
    ? SlideInRight.delay(index * 50).springify()
    : SlideInLeft.delay(index * 50).springify();

  // For system messages, center them
  if (isSystem) {
    return (
      <Animated.View
        entering={FadeIn.delay(index * 50)}
        layout={LinearTransition.springify()}
        style={styles.systemMessageContainer}
      >
        <View style={styles.systemMessageBubble}>
          <Ionicons
            name="information-circle"
            size={16}
            color={colors.primary}
          />
          <AppText
            size="xsmall"
            style={{ color: colors.medium, marginLeft: 6, flex: 1 }}
          >
            {message.text}
          </AppText>
        </View>
      </Animated.View>
    );
  }

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
            <View style={{ marginLeft: 10 }}>
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
        {isSupport && (
          <View style={styles.supportBadge}>
            <MaterialCommunityIcons
              name="shield-check"
              size={12}
              color={colors.primaryLighter}
            />
            <AppText
              size="xxsmall"
              fontWeight="semibold"
              style={{ color: colors.primaryLighter, marginLeft: 4 }}
            >
              Support Team
            </AppText>
          </View>
        )}

        <AppText
          size="regular"
          fontWeight="medium"
          style={{ color: textColor, lineHeight: 22 }}
        >
          {message.text}
        </AppText>

        <View style={styles.messageFooter}>
          <AppText
            size="xsmall"
            style={{
              color: isCurrentUser ? colors.lighter : colors.medium,
              marginTop: 4,
            }}
          >
            {new Date(message.timestamp).toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </AppText>

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

// Pro Quick Actions Modal
const ProQuickActionsModal = ({ visible, onClose, ticket, onAction }) => {
  const [selectedStatus, setSelectedStatus] = useState(ticket?.status);
  const [selectedPriority, setSelectedPriority] = useState(ticket?.priority);
  const [resolution, setResolution] = useState("");

  const handleApply = () => {
    onAction({
      status: selectedStatus || "",
      priority: selectedPriority || "",
      resolution: resolution.trim() || "",
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        entering={FadeIn}
        exiting={FadeOut}
        style={styles.modalOverlay}
      >
        <Pressable style={styles.modalOverlay} onPress={onClose}>
          <Animated.View
            entering={SlideInDown.springify().damping(90)}
            exiting={SlideOutDown.springify()}
            style={styles.actionModalContent}
            onStartShouldSetResponder={() => true}
          >
            <View style={styles.modalHeader}>
              <View>
                <AppText fontWeight="bold" size="large">
                  Manage Ticket
                </AppText>
                <AppText
                  size="xsmall"
                  style={{ color: colors.medium, marginTop: 2 }}
                >
                  Update status and priority
                </AppText>
              </View>
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={colors.medium} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Status Section */}
              <View style={styles.actionSection}>
                <AppText
                  fontWeight="semibold"
                  size="regular"
                  style={{ marginBottom: 12 }}
                >
                  Status
                </AppText>
                <View style={styles.optionGrid}>
                  {statusOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setSelectedStatus(option.value)}
                      style={[
                        styles.optionButton,
                        selectedStatus === option.value && {
                          backgroundColor: option.color + "20",
                          borderColor: option.color,
                        },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={16}
                        color={
                          selectedStatus === option.value
                            ? option.color
                            : colors.medium
                        }
                        style={{ marginRight: 6 }}
                      />
                      <AppText
                        size="small"
                        fontWeight={
                          selectedStatus === option.value ? "bold" : "regular"
                        }
                        style={{
                          color:
                            selectedStatus === option.value
                              ? option.color
                              : colors.medium,
                        }}
                      >
                        {option.label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Priority Section */}
              <View style={styles.actionSection}>
                <AppText
                  fontWeight="semibold"
                  size="regular"
                  style={{ marginBottom: 12 }}
                >
                  Priority
                </AppText>
                <View style={styles.optionGrid}>
                  {priorityOptions.map((option) => (
                    <Pressable
                      key={option.value}
                      onPress={() => setSelectedPriority(option.value)}
                      style={[
                        styles.optionButton,
                        selectedPriority === option.value && {
                          backgroundColor: option.color + "20",
                          borderColor: option.color,
                        },
                      ]}
                    >
                      <Ionicons
                        name={option.icon}
                        size={16}
                        color={
                          selectedPriority === option.value
                            ? option.color
                            : colors.medium
                        }
                        style={{ marginRight: 6 }}
                      />
                      <AppText
                        size="small"
                        fontWeight={
                          selectedPriority === option.value ? "bold" : "regular"
                        }
                        style={{
                          color:
                            selectedPriority === option.value
                              ? option.color
                              : colors.medium,
                        }}
                      >
                        {option.label}
                      </AppText>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Resolution Note */}
              {(selectedStatus === "resolved" ||
                selectedStatus === "closed") && (
                <View style={styles.actionSection}>
                  <AppText
                    fontWeight="semibold"
                    size="regular"
                    style={{ marginBottom: 10 }}
                  >
                    Resolution Note
                  </AppText>
                  <TextInput
                    style={styles.resolutionInput}
                    placeholder="Describe how this issue was resolved..."
                    placeholderTextColor={colors.medium}
                    value={resolution}
                    onChangeText={setResolution}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              )}
            </ScrollView>

            <View style={styles.modalActions}>
              <AppButton
                title="Cancel"
                onPress={onClose}
                contStyle={{ flex: 1, marginRight: 10 }}
                backgroundColor={colors.light}
                textColor={colors.medium}
              />
              <AppButton
                title="Apply Changes"
                onPress={handleApply}
                contStyle={{ flex: 1 }}
              />
            </View>
          </Animated.View>
        </Pressable>
      </Animated.View>
    </Modal>
  );
};

// Pro Action Bar Component
const ProActionBar = ({ ticket, onManageTicket, onQuickReply }) => {
  const getStatusConfig = (status) => {
    const configs = {
      open: { color: "#4CAF50", icon: "mail-open", label: "Open" },
      in_progress: { color: "#2196F3", icon: "time", label: "In Progress" },
      waiting_user: {
        color: "#FF9800",
        icon: "hourglass",
        label: "Waiting User",
      },
      resolved: {
        color: "#4CAF50",
        icon: "checkmark-circle",
        label: "Resolved",
      },
      closed: { color: "#9E9E9E", icon: "close-circle", label: "Closed" },
    };
    return configs[status] || configs.open;
  };

  const getPriorityConfig = (priority) => {
    const configs = {
      low: { color: "#4CAF50", icon: "arrow-down" },
      medium: { color: "#2196F3", icon: "remove" },
      high: { color: "#FF9800", icon: "arrow-up" },
      urgent: { color: "#F44336", icon: "warning" },
    };
    return configs[priority] || configs.medium;
  };

  const statusConfig = getStatusConfig(ticket?.status);
  const priorityConfig = getPriorityConfig(ticket?.priority);

  const quickReplies = [
    "I'm looking into this now",
    "Can you provide more details?",
    "This has been resolved",
  ];

  return (
    <View style={styles.proActionBar}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.proActionBarContent}
      >
        {/* Status Badge */}
        <View style={styles.statusBadgeContainer}>
          <View
            style={[
              styles.statusIndicator,
              { backgroundColor: statusConfig.color },
            ]}
          />
          <Ionicons
            name={statusConfig.icon}
            size={14}
            color={statusConfig.color}
          />
          <AppText
            size="xsmall"
            style={{ color: colors.medium, marginLeft: 4 }}
          >
            {statusConfig.label}
          </AppText>
        </View>

        {/* Priority Badge */}
        <View
          style={[
            styles.priorityBadgeContainer,
            { backgroundColor: priorityConfig.color + "20" },
          ]}
        >
          <Ionicons
            name={priorityConfig.icon}
            size={14}
            color={priorityConfig.color}
          />
          <AppText
            size="xsmall"
            fontWeight="semibold"
            style={{ color: priorityConfig.color, marginLeft: 4 }}
          >
            {ticket?.priority?.toUpperCase()}
          </AppText>
        </View>

        {/* Quick Reply Buttons */}
        {quickReplies.map((reply, index) => (
          <Pressable
            key={index}
            onPress={() => onQuickReply(reply)}
            style={styles.quickReplyButton}
          >
            <AppText size="xsmall" style={{ color: colors.primary }}>
              {reply}
            </AppText>
          </Pressable>
        ))}
      </ScrollView>

      {/* Manage Button */}
      <Pressable onPress={onManageTicket} style={styles.manageButton}>
        <Ionicons name="settings-sharp" size={18} color={colors.white} />
      </Pressable>
    </View>
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
  const [showActionModal, setShowActionModal] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [popper, setPopper] = useState({ vis: false });

  const { data, isLoading, refetch } = useFetchSingleTicketQuery(
    params?.ticketId,
  );
  const [sendTicketMessage, { isLoading: sendingMessage }] =
    useSendTicketMessageMutation();
  const [adminReplyTicket, { isLoading: replyingMessage }] =
    useAdminReplyTicketMutation();
  const [updateTicketStatus] = useUpdateTicketStatusMutation();
  const [updateTicketPriority] = useUpdateTicketPriorityMutation();

  const insets = useSafeAreaInsets();
  const typingTimeoutRef = useRef(null);

  // Check if current user is pro/admin
  const isPro =
    user?.accountType === "manager" || user?.accountType === "professional";

  const isResolved = ["resolved", "closed"].includes(data?.data?.status);

  const handleSendMessage = async (text = inputText) => {
    if (!text.trim()) return;

    const messageData = {
      _id: Date.now().toString(),
      sender: isPro ? "support" : "user",
      senderId: user._id,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      status: MessageStatus.SENDING,
    };

    setMessages((prev) => [...prev, messageData]);
    setInputText("");

    try {
      if (isPro) {
        await adminReplyTicket({
          ticketId: params?.ticketId,
          text: messageData.text,
        }).unwrap();
      } else {
        await sendTicketMessage({
          ticketId: params?.ticketId,
          text: messageData.text,
        }).unwrap();
      }

      // Update message status to sent
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageData._id
            ? { ...msg, status: MessageStatus.SENT }
            : msg,
        ),
      );
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageData._id
            ? { ...msg, status: MessageStatus.FAILED }
            : msg,
        ),
      );
    }
  };

  const handleProAction = async (actionData) => {
    try {
      const promises = [];

      // Update status if changed
      if (actionData.status !== data?.data?.status) {
        promises.push(
          updateTicketStatus({
            ticketId: params?.ticketId,
            status: actionData.status,
            resolution: actionData.resolution,
          }).unwrap(),
        );
      }

      // Update priority if changed
      if (actionData.priority !== data?.data?.priority) {
        promises.push(
          updateTicketPriority({
            ticketId: params?.ticketId,
            priority: actionData.priority,
          }).unwrap(),
        );
      }

      await Promise.all(promises);

      // Refetch ticket data
      await refetch();
    } catch (error) {
      setPopper({
        vis: true,
        type: "success",
        msg: error?.data?.message || "Something went wrong",
      });
    }
  };

  const handleQuickReply = (text) => {
    handleSendMessage(text);
  };

  const handleTyping = () => {
    if (!socket) return;

    socket.emit("typing_start", {
      ticketId: params?.ticketId,
      sender: isPro ? "support" : "user",
    });

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("typing_stop", {
        ticketId: params?.ticketId,
        sender: isPro ? "support" : "user",
      });
    }, 5000);
  };

  const renderMessage = ({ item, index }) => {
    const isCurrentUser = item.sender === (isPro ? "support" : "user");
    return (
      <MessageBubble
        message={item}
        isCurrentUser={isCurrentUser}
        index={index}
        isPro={isPro}
        category={{
          icon: params?.categoryIcon,
          color: params?.categoryColor,
          description: params?.categoryDescription,
          title: params?.categoryTitle,
        }}
      />
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } catch (_errr) {
    } finally {
      setRefreshing(false);
    }
  };

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    socket.on("new_message", ({ message }) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("message_delivered", ({ messageId }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id === messageId
            ? { ...msg, status: MessageStatus.DELIVERED }
            : msg,
        ),
      );
    });

    socket.on("message_read", () => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.sender === (isPro ? "support" : "user")
            ? { ...msg, status: MessageStatus.READ }
            : msg,
        ),
      );
    });

    socket.on("typing_start", ({ sender }) => {
      setTypingUser(sender);
    });

    socket.on("typing_stop", () => {
      setTypingUser(null);
    });

    return () => {
      socket.off("new_message");
      socket.off("message_delivered");
      socket.off("message_read");
      socket.off("typing_start");
      socket.off("typing_stop");
    };
  }, [isPro]);

  // Load initial messages
  useEffect(() => {
    if (data?.data?.messages) {
      setMessages(data.data.messages);
    }
    socket?.emit("join_ticket", params?.ticketId);
  }, [data]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const ticketUser = data?.data?.user;
  const displayName =
    isPro && ticketUser
      ? `${capCapitalize(getFullName(ticketUser, true))}`
      : (params?.categoryTitle ?? "Support Chat");

  return (
    <Screen style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={colors.black} />
        </Pressable>

        <View style={styles.headerInfo}>
          {isPro && ticketUser?.avatar?.image ? (
            <Avatar size={40} source={ticketUser.avatar.image} />
          ) : (
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
          )}
          <View style={{ flex: 1, marginLeft: 12 }}>
            <AppText fontWeight="bold" size="regular">
              {displayName}
            </AppText>
            <View style={styles.statusRow}>
              <View style={styles.onlineDot} />
              <AppText size="xsmall" style={{ color: colors.medium }}>
                {isPro ? "User" : "Support Team"} • Online
              </AppText>
            </View>
          </View>
        </View>

        {/* Info Button for Pros */}
        {isPro && (
          <Pressable
            onPress={() => setShowActionModal(true)}
            style={styles.infoButton}
          >
            <Ionicons
              name="information-circle"
              size={24}
              color={colors.primary}
            />
          </Pressable>
        )}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "padding"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item._id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messagesList}
          refreshControl={getRefresher({ refreshing, onRefresh })}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
          ListFooterComponent={
            <>
              {typingUser && typingUser !== (isPro ? "support" : "user") && (
                <TypingIndicator />
              )}
            </>
          }
        />

        {/* Pro Action Bar */}
        {isPro && data?.data && (
          <ProActionBar
            ticket={data.data}
            onManageTicket={() => setShowActionModal(true)}
            onQuickReply={handleQuickReply}
          />
        )}

        {/* Input Area */}
        <View
          style={[styles.inputContainer, { paddingBottom: insets.bottom + 8 }]}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              style={styles.input}
              placeholder={
                isResolved && !isPro ? "Issue Resolved" : "Type your message..."
              }
              placeholderTextColor={colors.medium}
              value={inputText}
              onChangeText={(val) => {
                handleTyping();
                setInputText(val);
              }}
              multiline
              editable={!isResolved && !isPro}
              maxLength={500}
            />
          </View>

          <Pressable
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || sendingMessage || replyingMessage}
            style={[
              styles.sendButton,
              (!inputText.trim() || sendingMessage || replyingMessage) &&
                styles.sendButtonDisabled,
            ]}
          >
            {sendingMessage || replyingMessage ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <Ionicons
                name="send"
                size={20}
                color={inputText.trim() ? colors.white : colors.lighter}
              />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      {/* Pro Quick Actions Modal */}
      {isPro && (
        <ProQuickActionsModal
          visible={showActionModal}
          onClose={() => setShowActionModal(false)}
          ticket={data?.data}
          onAction={handleProAction}
        />
      )}
      <LottieAnimator visible={isLoading} absolute wTransparent />
      <PopAlerts popData={popper} setPopData={setPopper} max={4} />
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
  infoButton: {
    padding: 8,
    marginLeft: 8,
  },
  headerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerInfoMsg: {
    flex: undefined,
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
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    paddingBottom: 20,
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
  systemMessageContainer: {
    alignItems: "center",
    marginVertical: 12,
  },
  systemMessageBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    maxWidth: "90%",
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
  proActionBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.white,
    paddingVertical: 10,
    paddingLeft: 16,
    paddingRight: 12,
    borderTopWidth: 1,
    borderTopColor: colors.extraLight,
  },
  proActionBarContent: {
    alignItems: "center",
    paddingRight: 8,
  },
  statusBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.unchange,
    marginRight: 8,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  priorityBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginRight: 8,
  },
  quickReplyButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.primary + "15",
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.primary + "30",
  },
  manageButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  actionModalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  closeButton: {
    padding: 4,
  },
  actionSection: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#E0E0E0",
    marginRight: 8,
    marginBottom: 8,
  },
  resolutionInput: {
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    fontFamily: "sf-regular",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    color: colors.black,
    minHeight: 100,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    marginTop: 20,
  },
});

export default ChatRoomScreen;
