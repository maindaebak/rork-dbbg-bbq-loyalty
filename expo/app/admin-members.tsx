import { CameraView, useCameraPermissions } from "expo-camera";
import type { PermissionResponse } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Stack, router } from "expo-router";
import {
  Camera,
  ChevronRight,
  QrCode,
  Search,
  User,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  ActionButton,
  CollapsiblePanel,
  InputField,
  LoyaltyScreen,
  Panel,
} from "@/components/loyalty/ui";
import { PhoneInput, DEFAULT_COUNTRY_CODE, type CountryCode } from "@/components/loyalty/phone-input";

import { useMembersStore, type StoredMember } from "@/providers/members-store-provider";

export default function AdminMembersScreen() {
  const { findMemberByPhone, getMemberById, members } = useMembersStore();
  const [searchPhone, setSearchPhone] = useState<string>("");
  const [searchCountryCode, setSearchCountryCode] = useState<CountryCode>(DEFAULT_COUNTRY_CODE);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [scanProcessing, setScanProcessing] = useState<boolean>(false);
  const [nameSearch, setNameSearch] = useState<string>("");
  const [nameSearchResults, setNameSearchResults] = useState<StoredMember[]>([]);
  const [nameSearchPerformed, setNameSearchPerformed] = useState<boolean>(false);

  const [nativePermission, nativeRequestPermission] = useCameraPermissions();
  const permission: PermissionResponse | null = Platform.OS !== "web" ? nativePermission : null;
  const requestPermission = useCallback(async () => {
    if (Platform.OS === "web") return { granted: false } as PermissionResponse;
    return nativeRequestPermission();
  }, [nativeRequestPermission]);

  const navigateToMember = useCallback((memberId: string) => {
    router.push({ pathname: "/admin-member-detail", params: { memberId } });
  }, []);

  const handleNameSearch = useCallback(() => {
    const query = nameSearch.trim().toLowerCase();
    if (query.length < 1) {
      Alert.alert("Enter a name", "Please enter at least one character to search.");
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const results = members.filter((m) => {
      const name = m.fullName.toLowerCase();
      const parts = query.split(/\s+/);
      return parts.every((part) => name.includes(part));
    });
    setNameSearchResults(results);
    setNameSearchPerformed(true);
    console.log("[AdminMembers] Name search for", query, "found", results.length, "results");
  }, [members, nameSearch]);

  const handleSelectNameResult = useCallback((member: StoredMember) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("[AdminMembers] Selected member from name search:", member.fullName);
    navigateToMember(member.id);
  }, [navigateToMember]);

  const handleSearch = useCallback(() => {
    const digits = searchPhone.replace(/\D/g, "");
    console.log("[AdminMembers] Searching for phone", digits, "with country code", searchCountryCode.dial);
    if (digits.length < 4) {
      Alert.alert("Invalid phone", "Please enter a valid phone number.");
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const fullNumber = searchCountryCode.dial.replace("+", "") + digits;
    const member = findMemberByPhone(fullNumber);
    if (!member) {
      setSearchPerformed(true);
      console.log("[AdminMembers] No member found for", fullNumber);
    } else {
      setSearchPerformed(false);
      console.log("[AdminMembers] Found member:", member.fullName);
      navigateToMember(member.id);
    }
  }, [findMemberByPhone, navigateToMember, searchCountryCode, searchPhone]);

  const handleOpenScanner = useCallback(async () => {
    if (Platform.OS === "web") {
      Alert.alert("Not available", "QR scanning is only available on mobile devices. Please use phone number search on web.");
      return;
    }
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert("Camera permission", "Camera access is needed to scan QR codes.");
        return;
      }
    }
    setScanProcessing(false);
    setShowScanner(true);
    console.log("[AdminMembers] Opening QR scanner");
  }, [permission, requestPermission]);

  const handleBarCodeScanned = useCallback((result: { data: string }) => {
    if (scanProcessing) return;
    setScanProcessing(true);
    console.log("[AdminMembers] QR scanned:", result.data);

    const data = result.data;
    if (!data.startsWith("dbbg-member:")) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Invalid QR code", "This QR code is not a valid Dae Bak member code.", [
        { text: "Try again", onPress: () => setScanProcessing(false) },
        { text: "Close", onPress: () => setShowScanner(false) },
      ]);
      return;
    }

    const memberId = data.replace("dbbg-member:", "");
    const member = getMemberById(memberId);

    if (!member) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Member not found", "No member found with this QR code.", [
        { text: "Try again", onPress: () => setScanProcessing(false) },
        { text: "Close", onPress: () => setShowScanner(false) },
      ]);
      return;
    }

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowScanner(false);
    console.log("[AdminMembers] Found member via QR:", member.fullName);
    navigateToMember(member.id);
  }, [getMemberById, navigateToMember, scanProcessing]);

  return (
    <>
      <Stack.Screen options={{ title: "Member Search", headerTransparent: true, headerTintColor: "#FFF7ED" }} />

      {showScanner && Platform.OS !== "web" && (
        <Modal
          animationType="slide"
          onRequestClose={() => setShowScanner(false)}
          visible={showScanner}
        >
          <View style={styles.scannerContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleBarCodeScanned}
            />
            <View style={styles.scannerOverlay}>
              <View style={styles.scannerFrame} />
            </View>
            <View style={styles.scannerHeader}>
              <Text style={styles.scannerTitle}>Scan Member QR Code</Text>
              <Text style={styles.scannerSubtitle}>Point camera at member's QR code</Text>
            </View>
            <Pressable
              onPress={() => setShowScanner(false)}
              style={({ pressed }) => [styles.scannerCloseButton, pressed && { opacity: 0.7 }]}
              testID="scanner-close-button"
            >
              <X color="#FFF" size={24} />
            </Pressable>
          </View>
        </Modal>
      )}

      <LoyaltyScreen
        eyebrow="Staff tools"
        subtitle="Search by phone number or scan QR code to find a member and manage their points."
        title="Find & add points."
        heroRight={
          <View style={styles.iconBadge} testID="admin-members-badge">
            <Search color="#F7C58B" size={20} />
          </View>
        }
      >
        <CollapsiblePanel
          testID="admin-name-search-panel"
          title="Search by name"
          copy="Search members by their first or last name."
          icon={Users}
          defaultOpen={true}
        >
          <InputField
            label="Member name"
            onChangeText={setNameSearch}
            placeholder="John, Doe, or John Doe"
            testID="admin-name-search-input"
            value={nameSearch}
          />
          <ActionButton
            icon={Search}
            label="Search by name"
            onPress={handleNameSearch}
            testID="admin-name-search-button"
            variant="primary"
          />

          {nameSearchPerformed && nameSearchResults.length === 0 && (
            <View style={styles.nameNoResult}>
              <User color="#C8AA94" size={22} />
              <Text style={styles.nameNoResultText}>No members found matching "{nameSearch}"</Text>
            </View>
          )}

          {nameSearchResults.length > 0 && (
            <View style={styles.nameResultsList}>
              <Text style={styles.nameResultsCount}>
                {nameSearchResults.length} member{nameSearchResults.length !== 1 ? "s" : ""} found
              </Text>
              {nameSearchResults.map((member) => (
                <Pressable
                  key={member.id}
                  onPress={() => handleSelectNameResult(member)}
                  style={({ pressed }) => [styles.nameResultCard, pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] }]}
                  testID={`name-result-${member.id}`}
                >
                  <View style={styles.nameResultAvatar}>
                    <User color="#22C55E" size={16} />
                  </View>
                  <View style={styles.nameResultInfo}>
                    <Text style={styles.nameResultName}>{member.fullName}</Text>
                    <Text style={styles.nameResultPhone}>{member.phone}</Text>
                    <Text style={styles.nameResultTapHint}>Tap to view details</Text>
                  </View>
                  <View style={styles.nameResultArrow}>
                    <ChevronRight color="#22C55E" size={18} />
                  </View>
                </Pressable>
              ))}
            </View>
          )}
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="admin-search-panel"
          title="Search by phone"
          copy="Enter the member's phone number to look up their account."
          icon={Search}
        >
          <PhoneInput
            countryCode={searchCountryCode}
            onCountryCodeChange={setSearchCountryCode}
            phoneNumber={searchPhone}
            onPhoneNumberChange={setSearchPhone}
            testID="admin-search-phone-input"
          />
          <ActionButton
            icon={Search}
            label="Search member"
            onPress={handleSearch}
            testID="admin-search-button"
            variant="primary"
          />
        </CollapsiblePanel>

        <CollapsiblePanel
          testID="admin-qr-scan-panel"
          title="Scan QR code"
          copy="Scan the member's QR code from their app for quick lookup."
          icon={QrCode}
        >
          <Pressable
            onPress={handleOpenScanner}
            style={({ pressed }) => [styles.qrScanButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
            testID="admin-open-scanner-button"
          >
            <View style={styles.qrScanIconWrap}>
              <Camera color="#F7C58B" size={24} />
            </View>
            <View style={styles.qrScanTextWrap}>
              <Text style={styles.qrScanTitle}>Open QR Scanner</Text>
              <Text style={styles.qrScanSubtitle}>
                {Platform.OS === "web" ? "Available on mobile only" : "Use camera to scan member code"}
              </Text>
            </View>
            <QrCode color="#F7C58B" size={20} />
          </Pressable>
        </CollapsiblePanel>

        {searchPerformed && (
          <Panel testID="admin-no-result-panel">
            <View style={styles.noResult}>
              <User color="#C8AA94" size={28} />
              <Text style={styles.noResultTitle}>No member found</Text>
              <Text style={styles.noResultText}>
                No account is linked to this phone number. The member may need to sign up first.
              </Text>
            </View>
          </Panel>
        )}
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
  noResult: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
  },
  noResultText: {
    color: "#C8AA94",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  noResultTitle: {
    color: "#FFF7ED",
    fontSize: 17,
    fontWeight: "800" as const,
  },
  qrScanButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  qrScanIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  qrScanTextWrap: {
    flex: 1,
    gap: 2,
  },
  qrScanTitle: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  qrScanSubtitle: {
    color: "#C8AA94",
    fontSize: 12,
  },
  scannerContainer: {
    backgroundColor: "#000",
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    alignItems: "center",
    bottom: 0,
    justifyContent: "center",
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scannerFrame: {
    borderColor: "#F7C58B",
    borderRadius: 24,
    borderWidth: 3,
    height: 260,
    width: 260,
  },
  scannerHeader: {
    alignItems: "center",
    left: 0,
    paddingTop: 100,
    position: "absolute",
    right: 0,
    top: 0,
  },
  scannerTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "800" as const,
  },
  scannerSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    marginTop: 6,
  },
  scannerCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 999,
    bottom: 60,
    height: 56,
    justifyContent: "center",
    left: "50%",
    marginLeft: -28,
    position: "absolute",
    width: 56,
  },
  nameNoResult: {
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
  },
  nameNoResultText: {
    color: "#C8AA94",
    fontSize: 13,
    textAlign: "center" as const,
  },
  nameResultsList: {
    gap: 10,
  },
  nameResultsCount: {
    color: "#22C55E",
    fontSize: 13,
    fontWeight: "800" as const,
    marginBottom: 2,
  },
  nameResultCard: {
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.3)",
    borderRadius: 16,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  nameResultAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.15)",
    borderRadius: 14,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  nameResultInfo: {
    flex: 1,
    gap: 2,
  },
  nameResultName: {
    color: "#FFF7ED",
    fontSize: 16,
    fontWeight: "800" as const,
  },
  nameResultPhone: {
    color: "#86EFAC",
    fontSize: 12,
    fontWeight: "600" as const,
  },
  nameResultTapHint: {
    color: "#22C55E",
    fontSize: 11,
    fontWeight: "700" as const,
    marginTop: 2,
  },
  nameResultArrow: {
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
    borderRadius: 10,
    height: 32,
    justifyContent: "center",
    width: 32,
  },
});
