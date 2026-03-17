import { Stack } from "expo-router";
import { FileText } from "lucide-react-native";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { LoyaltyScreen, Panel, SectionTitle } from "@/components/loyalty/ui";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";

export default function TermsConditionsScreen() {
  const { settings } = useLoyaltyProgram();

  const paragraphs = useMemo(() => {
    return settings.termsAndConditions
      .split("\n\n")
      .map((p) => p.trim())
      .filter(Boolean);
  }, [settings.termsAndConditions]);

  return (
    <>
      <Stack.Screen options={{ title: "Terms & Conditions", headerTransparent: true, headerTintColor: "#FFF7ED" }} />
      <LoyaltyScreen
        eyebrow="Legal"
        subtitle="Please read the following terms and conditions carefully before using the Dae Bak Bon Ga Loyalty Program."
        title="Terms & conditions."
        heroRight={
          <View style={styles.iconBadge} testID="terms-badge">
            <FileText color="#F7C58B" size={20} />
          </View>
        }
      >
        <Panel testID="terms-content-panel">
          <SectionTitle
            copy="Last updated by restaurant management."
            title="Loyalty Program Terms"
          />
          {paragraphs.map((paragraph, index) => {
            const isHeading = /^\d+\./.test(paragraph) && paragraph.length < 80;
            return (
              <View key={index}>
                {isHeading ? (
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
  heading: {
    color: "#F7C58B",
    fontSize: 15,
    fontWeight: "800" as const,
    marginTop: 4,
  },
  paragraph: {
    color: "#E7CDB8",
    fontSize: 14,
    lineHeight: 22,
  },
});
