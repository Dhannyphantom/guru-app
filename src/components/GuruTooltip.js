// GuruTooltip.tsx
import React from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { useCopilot } from "react-native-copilot";
import AppText from "../components/AppText"; // adjust path as needed

const GuruTooltip = () => {
  const { isFirstStep, isLastStep, goToNext, goToPrev, stop, currentStep } =
    useCopilot();

  return (
    <View style={styles.container}>
      {/* Step title */}
      <AppText size="medium" fontWeight="bold" style={styles.title}>
        {currentStep?.name}
      </AppText>

      {/* Step description */}
      <AppText size="regular" fontWeight="regular" style={styles.description}>
        {currentStep?.text}
      </AppText>

      {/* Navigation buttons */}
      <View style={styles.buttonRow}>
        {/* Skip button — always visible */}
        <Pressable onPress={() => stop()} style={styles.skipButton}>
          <AppText size="small" fontWeight="regular" style={styles.skipText}>
            Skip
          </AppText>
        </Pressable>

        {/* Prev button — hidden on first step */}
        {!isFirstStep && (
          <Pressable onPress={() => goToPrev()} style={styles.navButton}>
            <AppText size="small" fontWeight="regular" style={styles.navText}>
              ← Prev
            </AppText>
          </Pressable>
        )}

        {/* Next / Finish button */}
        <Pressable
          onPress={() => (isLastStep ? stop() : goToNext())}
          style={[styles.navButton, styles.primaryButton]}
          // style={({ pressed }) => [
          //   styles.navButton,
          //   styles.primaryButton,
          //   pressed && styles.primaryButtonPressed,
          // ]}
        >
          <AppText
            size="small"
            fontWeight="semibold"
            style={styles.primaryText}
          >
            {isLastStep ? "Finish 🎉" : "Next →"}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#1E1E2E",
    borderRadius: 12,
    padding: 16,
    minWidth: 260,
  },
  title: {
    color: "#CBA6F7",
    marginBottom: 6,
    textTransform: "capitalize",
  },
  description: {
    color: "#CDD6F4",
    marginBottom: 14,
    lineHeight: 20,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  skipButton: {
    marginRight: "auto",
    padding: 6,
  },
  skipText: {
    color: "#6C7086",
  },
  navButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#313244",
  },
  navText: {
    color: "#CDD6F4",
  },
  primaryButton: {
    backgroundColor: "#CBA6F7",
  },
  primaryButtonPressed: {
    opacity: 0.8,
  },
  primaryText: {
    color: "#1E1E2E",
  },
});

export default GuruTooltip;
