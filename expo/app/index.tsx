import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

import { useAuth } from "@/providers/auth-provider";

export default function IndexScreen() {
  const { isReady, isLoggedIn } = useAuth();

  if (!isReady) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color="#F7C58B" size="large" />
      </View>
    );
  }

  if (isLoggedIn) {
    return <Redirect href="/member-dashboard" />;
  }

  return <Redirect href="/welcome" />;
}

const styles = StyleSheet.create({
  loader: {
    alignItems: "center",
    backgroundColor: "#120A08",
    flex: 1,
    justifyContent: "center",
  },
});
