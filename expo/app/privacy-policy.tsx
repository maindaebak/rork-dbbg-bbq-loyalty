import { Stack } from "expo-router";
import { Shield } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LoyaltyScreen, Panel, SectionTitle } from "@/components/loyalty/ui";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

export default function PrivacyPolicyScreen() {
  const { settings } = useLoyaltyProgram();

  const paragraphs = useMemo(() => {
    return settings.privacyPolicy
      .split("\n\n")
      .map((p) => p.trim())
      .filter(Boolean);
  }, [settings.privacyPolicy]);

  return (
    <>
      <Stack.Screen options={{ title: "Privacy Policy", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Legal"
        subtitle="Please read the following privacy policy to understand how we collect, use, and protect your information."
        title="Privacy policy."
        heroRight={
          <View style={styles.iconBadge} testID="privacy-badge">
            <Shield color="#F7C58B" size={20} />
          </View>
        }
      >
        <Panel testID="privacy-content-panel">
          <SectionTitle
            copy="Last updated by restaurant management."
            title="Privacy Policy"
          />
          {paragraphs.map((paragraph, index) => {
            const isHeading = /^\d+\./.test(paragraph) && paragraph.length < 80;
            const isTitle = paragraph === "Privacy Policy" || paragraph.startsWith("Last Updated:");
            return (
              <View key={index}>
                {isTitle ? (
                  <Text style={styles.titleText}>{paragraph}</Text>
                ) : isHeading ? (
                  <Text style={styles.heading}>{paragraph}</Text>
                ) : (
                  <Text style={styles.paragraph}>{paragraph}</Text>
                )}
              </View>
            );
          })}
        </Panel>
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  heading: {
    color: "#F7C58B",
    fontSize: 15,
    fontWeight: "800" as const,
    marginTop: 4,
  },
  iconBadge: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.12)",
    borderColor: "rgba(247, 197, 139, 0.25)",
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  paragraph: {
    color: "#E7CDB8",
    fontSize: 14,
    lineHeight: 22,
  },
  titleText: {
    color: "#FFF7ED",
    fontSize: 16,
    fontWeight: "800" as const,
  },
});
