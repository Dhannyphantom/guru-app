import { StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import { useLocalSearchParams } from "expo-router";
import { WithdrawModal } from "./SubscriptionScreen";
import AppHeader from "../components/AppHeader";
import TabSelector from "../components/TabSelector";

export default function PaymentScreen() {
  const { type } = useLocalSearchParams();

  return (
    <View>
      <WithdrawModal />
    </View>
  );
}

const styles = StyleSheet.create({});
