import { CameraView, useCameraPermissions } from "expo-camera";
import type { PermissionResponse } from "expo-camera";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import {
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Edit3,
  Flame,
  Gift,
  MessageSquareMore,
  Minus,
  Phone,
  QrCode,
  Save,
  Search,
  ShieldCheck,
  Star,
  Trash2,
  TrendingUp,
  User,
  Users,
  X,
} from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import {
  ActionButton,
  CollapsiblePanel,
  InputField,
  LoyaltyScreen,
  Panel,
} from "@/components/loyalty/ui";
import { sendSmsCode, verifySmsCode } from "@/lib/api";
import { useLoyaltyProgram } from "@/providers/loyalty-program-provider";
import { useMembersStore, type StoredMember } from "@/providers/members-store-provider";

function formatPhone(value: string): string {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function formatPoints(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getMemberStats(member: StoredMember) {
  const earned = member.pointsHistory.filter((e) => e.type === "earned");
  const redeemed = member.pointsHistory.filter((e) => e.type === "redeemed");
  const totalEarned = earned.reduce((s, e) => s + e.amount, 0);
  const totalRedeemed = redeemed.reduce((s, e) => s + Math.abs(e.amount), 0);
  const totalSpent = earned.reduce((s, e) => s + e.dollarAmount, 0);
  const visitCount = earned.length;

  let lastVisit: string | null = null;
  if (earned.length > 0) {
    const sorted = [...earned].sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime());
    lastVisit = sorted[0].addedAt;
  }

  return { visitCount, totalEarned, totalRedeemed, totalSpent, lastVisit, earnedCount: earned.length, redeemedCount: redeemed.length };
}

export default function AdminMembersScreen() {
  const { findMemberByPhone, getMemberById, addPoints, removePoints, members, getActivePoints, updateMemberProfile, deleteMember } = useMembersStore();
  const { settings } = useLoyaltyProgram();
  const [searchPhone, setSearchPhone] = useState<string>("");
  const [foundMember, setFoundMember] = useState<StoredMember | null>(null);
  const [searchPerformed, setSearchPerformed] = useState<boolean>(false);
  const [dollarAmount, setDollarAmount] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [showScanner, setShowScanner] = useState<boolean>(false);
  const [scanProcessing, setScanProcessing] = useState<boolean>(false);
  const [removeMode, setRemoveMode] = useState<boolean>(false);
  const [removeAmount, setRemoveAmount] = useState<string>("");
  const [removeNote, setRemoveNote] = useState<string>("");
  const [editMode, setEditMode] = useState<boolean>(false);
  const [editName, setEditName] = useState<string>("");

  const [editPhone, setEditPhone] = useState<string>("");
  const [editBirthMonth, setEditBirthMonth] = useState<string>("");
  const [editBirthDay, setEditBirthDay] = useState<string>("");
  const [editBirthYear, setEditBirthYear] = useState<string>("");
  const [nameSearch, setNameSearch] = useState<string>("");
  const [nameSearchResults, setNameSearchResults] = useState<StoredMember[]>([]);
  const [nameSearchPerformed, setNameSearchPerformed] = useState<boolean>(false);

  const [redeemVerifyRewardId, setRedeemVerifyRewardId] = useState<string | null>(null);
  const [redeemVerifyRewardTitle, setRedeemVerifyRewardTitle] = useState<string>("");
  const [redeemVerifyRewardPoints, setRedeemVerifyRewardPoints] = useState<number>(0);
  const [redeemVerifyStep, setRedeemVerifyStep] = useState<"idle" | "sending" | "sent" | "verifying">("idle");
  const [redeemVerifyCode, setRedeemVerifyCode] = useState<string>("");
  const [isSendingRedeemCode, setIsSendingRedeemCode] = useState<boolean>(false);
  const [isVerifyingRedeem, setIsVerifyingRedeem] = useState<boolean>(false);

  const [nativePermission, nativeRequestPermission] = useCameraPermissions();
  const permission: PermissionResponse | null = Platform.OS !== "web" ? nativePermission : null;
  const requestPermission = useCallback(async () => {
    if (Platform.OS === "web") return { granted: false } as PermissionResponse;
    return nativeRequestPermission();
  }, [nativeRequestPermission]);

  const activePoints = useMemo<number>(() => {
    if (!foundMember) return 0;
    return getActivePoints(foundMember.id);
  }, [foundMember, getActivePoints]);

  const currentTier = useMemo(() => {
    if (!foundMember) return null;
    const sorted = [...settings.tiers].sort((a, b) => a.minPoints - b.minPoints);
    return sorted.reduce((active, tier) => {
      if (activePoints >= tier.minPoints) return tier;
      return active;
    }, sorted[0]);
  }, [activePoints, foundMember, settings.tiers]);

  const stats = useMemo(() => {
    if (!foundMember) return null;
    return getMemberStats(foundMember);
  }, [foundMember]);

  const calculatedPoints = useMemo<number>(() => {
    const dollars = parseFloat(dollarAmount);
    if (!dollars || dollars <= 0) return 0;
    return Math.round(dollars * settings.pointsPerDollar);
  }, [dollarAmount, settings.pointsPerDollar]);

  const redeemableRewards = useMemo(() => {
    return settings.rewards.map((reward) => ({
      ...reward,
      canRedeem: activePoints >= reward.points,
    }));
  }, [activePoints, settings.rewards]);

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
    setFoundMember(member);
    setSearchPerformed(true);
    setSearchPhone(member.phone);
    setDollarAmount("");
    setNote("");
    setRemoveMode(false);
    setRemoveAmount("");
    setRemoveNote("");
    setNameSearch("");
    setNameSearchResults([]);
    setNameSearchPerformed(false);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    console.log("[AdminMembers] Selected member from name search:", member.fullName);
  }, []);

  const handleDeleteMember = useCallback(() => {
    if (!foundMember) return;
    Alert.alert(
      "Delete member account",
      `Are you sure you want to permanently delete ${foundMember.fullName}'s account?\n\nThis action cannot be undone. All points and history will be lost.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Final confirmation",
              `Type-confirm: Permanently delete ${foundMember.fullName}?`,
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Yes, Delete",
                  style: "destructive",
                  onPress: () => {
                    deleteMember(foundMember.id);
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    setFoundMember(null);
                    setSearchPerformed(false);
                    setSearchPhone("");
                    Alert.alert("Deleted", `${foundMember.fullName}'s account has been permanently deleted.`);
                    console.log("[AdminMembers] Deleted member", foundMember.id);
                  },
                },
              ],
            );
          },
        },
      ],
    );
  }, [deleteMember, foundMember]);

  const handleSearch = useCallback(() => {
    const digits = searchPhone.replace(/\D/g, "");
    console.log("[AdminMembers] Searching for phone", digits);
    if (digits.length !== 10) {
      Alert.alert("Invalid phone", "Please enter a valid 10-digit phone number.");
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const member = findMemberByPhone(digits);
    setFoundMember(member ?? null);
    setSearchPerformed(true);
    setDollarAmount("");
    setNote("");
    setRemoveMode(false);
    setRemoveAmount("");
    setRemoveNote("");
    if (!member) {
      console.log("[AdminMembers] No member found for", digits);
    } else {
      console.log("[AdminMembers] Found member:", member.fullName);
    }
  }, [findMemberByPhone, searchPhone]);

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
    setFoundMember(member);
    setSearchPerformed(true);
    setSearchPhone(member.phone);
    setDollarAmount("");
    setNote("");
    setRemoveMode(false);
    setRemoveAmount("");
    setRemoveNote("");
    setShowScanner(false);
    console.log("[AdminMembers] Found member via QR:", member.fullName);
  }, [getMemberById, scanProcessing]);

  const handleStartEdit = useCallback(() => {
    if (!foundMember) return;
    const bdParts = foundMember.birthdate ? foundMember.birthdate.split("/") : ["", ""];
    setEditName(foundMember.fullName);
    setEditPhone(foundMember.phone);
    setEditBirthMonth(bdParts[0] ?? "");
    setEditBirthDay(bdParts[1] ?? "");
    setEditBirthYear(foundMember.birthYear ?? "");
    setEditMode(true);
    console.log("[AdminMembers] Started editing member profile", foundMember.id);
  }, [foundMember]);

  const handleSaveEdit = useCallback(() => {
    if (!foundMember) return;
    if (!editName.trim()) {
      Alert.alert("Invalid name", "Please enter the member's full name.");
      return;
    }
    const phoneDigits = editPhone.replace(/\D/g, "");
    if (phoneDigits.length !== 10) {
      Alert.alert("Invalid phone", "Please enter a valid 10-digit phone number.");
      return;
    }
    const month = parseInt(editBirthMonth, 10);
    const day = parseInt(editBirthDay, 10);
    const year = parseInt(editBirthYear, 10);
    if (!month || month < 1 || month > 12 || !day || day < 1 || day > 31 || !year || year < 1900 || year > new Date().getFullYear()) {
      Alert.alert("Invalid birthday", "Please enter a valid birthday (month, day, and year).");
      return;
    }

    const birthdate = `${editBirthMonth.padStart(2, "0")}/${editBirthDay.padStart(2, "0")}`;
    const birthYear = editBirthYear;

    Alert.alert(
      "Confirm changes",
      `Save profile changes for ${foundMember.fullName}?\n\nName: ${editName.trim()}\nPhone: ${editPhone}\nBirthday: ${birthdate}/${birthYear}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save",
          onPress: () => {
            updateMemberProfile(foundMember.id, {
              fullName: editName.trim(),
              phone: editPhone,
              birthdate,
              birthYear,
            });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const updated = members.find((m) => m.id === foundMember.id);
            if (updated) {
              setFoundMember({
                ...updated,
                fullName: editName.trim(),
                phone: editPhone,
                birthdate,
                birthYear,
              });
            }
            setEditMode(false);
            Alert.alert("Updated", "Member profile has been updated successfully.");
            console.log("[AdminMembers] Saved profile edits for member", foundMember.id);
          },
        },
      ],
    );
  }, [editBirthDay, editBirthMonth, editBirthYear, editName, editPhone, foundMember, members, updateMemberProfile]);

  const handleCancelEdit = useCallback(() => {
    setEditMode(false);
    console.log("[AdminMembers] Cancelled editing");
  }, []);

  const handleAddPoints = useCallback(() => {
    if (!foundMember) return;
    const dollars = parseFloat(dollarAmount);
    if (!dollars || dollars <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid sub-total amount.");
      return;
    }

    const pointsToAdd = Math.round(dollars * settings.pointsPerDollar);

    Alert.alert(
      "Confirm points",
      `Add ${formatPoints(pointsToAdd)} points to ${foundMember.fullName}?\n\nSub-total: $${dollars.toFixed(2)}\nRate: ${settings.pointsPerDollar} pts per $1\nPoints: ${formatPoints(pointsToAdd)}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Add",
          style: "default",
          onPress: () => {
            const pointsAdded = addPoints(foundMember.id, dollars, settings.pointsPerDollar, note.trim() || "Staff transaction", {
              tiers: settings.tiers,
              tierBonusEnabled: settings.tierBonusEnabled,
            });
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            Alert.alert(
              "Points added",
              `${formatPoints(pointsAdded)} points added to ${foundMember.fullName}'s account.`,
            );
            setDollarAmount("");
            setNote("");

            const updated = members.find((m) => m.id === foundMember.id);
            if (updated) {
              setFoundMember({ ...updated, points: updated.points + pointsAdded, pointsHistory: [...updated.pointsHistory] });
            }
          },
        },
      ],
    );
  }, [addPoints, dollarAmount, foundMember, members, note, settings.pointsPerDollar, settings.tiers, settings.tierBonusEnabled]);

  const handleRemovePoints = useCallback(() => {
    if (!foundMember) return;
    const amount = parseInt(removeAmount, 10);
    if (!amount || amount <= 0) {
      Alert.alert("Invalid amount", "Please enter a valid number of points to remove.");
      return;
    }

    if (amount > activePoints) {
      Alert.alert("Insufficient points", `${foundMember.fullName} only has ${formatPoints(activePoints)} active points.`);
      return;
    }

    Alert.alert(
      "Confirm removal",
      `Remove ${formatPoints(amount)} points from ${foundMember.fullName}?\n\nReason: ${removeNote.trim() || "Staff correction"}`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => {
            removePoints(foundMember.id, amount, removeNote.trim() || "Staff correction");
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            Alert.alert(
              "Points removed",
              `${formatPoints(amount)} points removed from ${foundMember.fullName}'s account.`,
            );
            setRemoveAmount("");
            setRemoveNote("");
            setRemoveMode(false);

            const updated = members.find((m) => m.id === foundMember.id);
            if (updated) {
              setFoundMember({ ...updated, points: Math.max(0, updated.points - amount), pointsHistory: [...updated.pointsHistory] });
            }
          },
        },
      ],
    );
  }, [activePoints, foundMember, members, removeAmount, removeNote, removePoints]);

  const handleStartRedeemVerify = useCallback((rewardId: string, rewardTitle: string, rewardPoints: number) => {
    if (!foundMember) return;

    if (activePoints < rewardPoints) {
      Alert.alert(
        "Insufficient points",
        `${foundMember.fullName} needs ${formatPoints(rewardPoints)} points but only has ${formatPoints(activePoints)} active points.`,
      );
      return;
    }

    setRedeemVerifyRewardId(rewardId);
    setRedeemVerifyRewardTitle(rewardTitle);
    setRedeemVerifyRewardPoints(rewardPoints);
    setRedeemVerifyStep("idle");
    setRedeemVerifyCode("");
    console.log("[AdminMembers] Started redeem verify flow for", rewardTitle);
  }, [activePoints, foundMember]);

  const handleSendRedeemCode = useCallback(async () => {
    if (!foundMember) return;
    setIsSendingRedeemCode(true);
    setRedeemVerifyStep("sending");
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      console.log("[AdminMembers] Sending redeem verification SMS to:", foundMember.phone);
      const result = await sendSmsCode(foundMember.phone);
      console.log("[AdminMembers] SMS result:", JSON.stringify(result));

      if (!result.success) {
        throw new Error(result.error ?? "Failed to send verification code.");
      }

      setRedeemVerifyStep("sent");
      Alert.alert("Code sent", `A 6-digit verification code was sent to ${foundMember.fullName}'s phone.`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("[AdminMembers] Redeem SMS error:", msg);
      setRedeemVerifyStep("idle");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Failed to send code", msg);
    } finally {
      setIsSendingRedeemCode(false);
    }
  }, [foundMember]);

  const handleVerifyAndRedeem = useCallback(async () => {
    if (!foundMember || !redeemVerifyRewardId) return;
    if (redeemVerifyCode.trim().length !== 6) {
      Alert.alert("Invalid code", "Enter the 6-digit verification code from the member's phone.");
      return;
    }

    setIsVerifyingRedeem(true);
    setRedeemVerifyStep("verifying");
    try {
      console.log("[AdminMembers] Verifying redeem code for:", foundMember.phone);
      const result = await verifySmsCode(foundMember.phone, redeemVerifyCode);
      console.log("[AdminMembers] Verify result:", JSON.stringify(result));

      if (!result.success) {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Verification failed", "The code is incorrect. Please try again.");
        setRedeemVerifyStep("sent");
        return;
      }

      removePoints(foundMember.id, redeemVerifyRewardPoints, `Redeemed: ${redeemVerifyRewardTitle}`);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        "Reward redeemed!",
        `"${redeemVerifyRewardTitle}" has been redeemed for ${foundMember.fullName}. ${formatPoints(redeemVerifyRewardPoints)} points deducted.`,
      );

      const updated = members.find((m) => m.id === foundMember.id);
      if (updated) {
        setFoundMember({ ...updated, points: Math.max(0, updated.points - redeemVerifyRewardPoints), pointsHistory: [...updated.pointsHistory] });
      }
      console.log("[AdminMembers] Redeemed reward", redeemVerifyRewardTitle, "for member", foundMember.id);

      setRedeemVerifyRewardId(null);
      setRedeemVerifyRewardTitle("");
      setRedeemVerifyRewardPoints(0);
      setRedeemVerifyStep("idle");
      setRedeemVerifyCode("");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Please try again.";
      console.error("[AdminMembers] Redeem verify error:", msg);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Verification failed", msg);
      setRedeemVerifyStep("sent");
    } finally {
      setIsVerifyingRedeem(false);
    }
  }, [foundMember, members, redeemVerifyCode, redeemVerifyRewardId, redeemVerifyRewardPoints, redeemVerifyRewardTitle, removePoints]);

  const handleCancelRedeem = useCallback(() => {
    setRedeemVerifyRewardId(null);
    setRedeemVerifyRewardTitle("");
    setRedeemVerifyRewardPoints(0);
    setRedeemVerifyStep("idle");
    setRedeemVerifyCode("");
  }, []);

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
          testID="admin-search-panel"
          title="Search by phone"
          copy="Enter the member's phone number to look up their account."
          icon={Search}
          defaultOpen={true}
        >
          <InputField
            label="Phone number"
            keyboardType="phone-pad"
            onChangeText={(v) => setSearchPhone(formatPhone(v))}
            placeholder="555-123-4567"
            testID="admin-search-phone-input"
            value={searchPhone}
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
          testID="admin-name-search-panel"
          title="Search by name"
          copy="Search members by their first or last name."
          icon={Users}
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
                  style={({ pressed }) => [styles.nameResultCard, pressed && { opacity: 0.7, transform: [{ scale: 0.98 }] }]}
                  testID={`name-result-${member.id}`}
                >
                  <View style={styles.nameResultAvatar}>
                    <User color="#F7C58B" size={16} />
                  </View>
                  <View style={styles.nameResultInfo}>
                    <Text style={styles.nameResultName}>{member.fullName}</Text>
                    <Text style={styles.nameResultPhone}>{member.phone}</Text>
                  </View>
                  <ChevronRight color="#8E6D56" size={16} />
                </Pressable>
              ))}
            </View>
          )}
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

        {searchPerformed && !foundMember && (
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

        {foundMember && stats && (
          <>
            <CollapsiblePanel
              testID="admin-member-info-panel"
              title="Member found"
              copy="Verify that this is the correct member before adding points."
              icon={User}
              defaultOpen={true}
            >
              <View style={styles.memberCard}>
                <View style={styles.memberAvatar}>
                  <User color="#F7C58B" size={22} />
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{foundMember.fullName}</Text>
                  {currentTier && (
                    <View style={styles.tierBadge}>
                      <View style={[styles.tierDot, { backgroundColor: currentTier.accent }]} />
                      <Text style={styles.tierBadgeText}>{currentTier.name}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.infoGrid}>
                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Phone color="#F7C58B" size={14} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Phone</Text>
                    <Text style={styles.infoValue}>{foundMember.phone}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Flame color="#F7C58B" size={14} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Tier</Text>
                    <Text style={[styles.infoValue, { color: currentTier?.accent ?? "#F7C58B" }]}>
                      {currentTier?.name ?? "Member"}
                    </Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Star color="#F7C58B" size={14} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Active Points</Text>
                    <Text style={styles.infoValueLarge}>{formatPoints(activePoints)}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Calendar color="#F7C58B" size={14} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Member since</Text>
                    <Text style={styles.infoValue}>{formatDate(foundMember.createdAt)}</Text>
                  </View>
                </View>

                <View style={styles.infoDivider} />

                <View style={styles.infoRow}>
                  <View style={styles.infoIconWrap}>
                    <Calendar color="#F7C58B" size={14} />
                  </View>
                  <View style={styles.infoContent}>
                    <Text style={styles.infoLabel}>Birthday</Text>
                    <Text style={styles.infoValue}>
                      {foundMember.birthdate ? `${foundMember.birthdate}/${foundMember.birthYear}` : "Not set"}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.verifyBanner}>
                <Star color="#22C55E" size={16} />
                <Text style={styles.verifyText}>Verify the name matches before adding points</Text>
              </View>
            </CollapsiblePanel>

            <CollapsiblePanel
              testID="admin-edit-profile-panel"
              title="Edit member profile"
              copy="Edit this member's profile information including name, contact details, and birthday."
              icon={Edit3}
              iconColor="#60A5FA"
            >
              {!editMode ? (
                <Pressable
                  onPress={handleStartEdit}
                  style={({ pressed }) => [styles.editToggleButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                  testID="admin-edit-profile-button"
                >
                  <View style={styles.editToggleIconWrap}>
                    <Edit3 color="#60A5FA" size={20} />
                  </View>
                  <View style={styles.editToggleTextWrap}>
                    <Text style={styles.editToggleTitle}>Edit Profile</Text>
                    <Text style={styles.editToggleSubtitle}>Change name, contact info, or birthday</Text>
                  </View>
                </Pressable>
              ) : (
                <>
                  <InputField
                    label="Full name"
                    onChangeText={setEditName}
                    placeholder="John Doe"
                    testID="admin-edit-name-input"
                    value={editName}
                  />
                  <InputField
                    label="Phone number"
                    keyboardType="phone-pad"
                    onChangeText={(v) => setEditPhone(formatPhone(v))}
                    placeholder="555-123-4567"
                    testID="admin-edit-phone-input"
                    value={editPhone}
                  />
                  <Text style={styles.editFieldLabel}>Birthday</Text>
                  <View style={styles.birthdayRow}>
                    <View style={styles.birthdayField}>
                      <InputField
                        label="Month"
                        keyboardType="numeric"
                        onChangeText={(v) => setEditBirthMonth(v.replace(/\D/g, "").slice(0, 2))}
                        placeholder="MM"
                        testID="admin-edit-birth-month"
                        value={editBirthMonth}
                      />
                    </View>
                    <View style={styles.birthdayField}>
                      <InputField
                        label="Day"
                        keyboardType="numeric"
                        onChangeText={(v) => setEditBirthDay(v.replace(/\D/g, "").slice(0, 2))}
                        placeholder="DD"
                        testID="admin-edit-birth-day"
                        value={editBirthDay}
                      />
                    </View>
                    <View style={styles.birthdayField}>
                      <InputField
                        label="Year"
                        keyboardType="numeric"
                        onChangeText={(v) => setEditBirthYear(v.replace(/\D/g, "").slice(0, 4))}
                        placeholder="YYYY"
                        testID="admin-edit-birth-year"
                        value={editBirthYear}
                      />
                    </View>
                  </View>

                  <View style={styles.editIdNote}>
                    <ShieldCheck color="#F59E0B" size={16} />
                    <Text style={styles.editIdNoteText}>
                      Verify member's real government-issued ID before changing birthday
                    </Text>
                  </View>

                  <View style={styles.editActions}>
                    <Pressable
                      onPress={handleCancelEdit}
                      style={({ pressed }) => [styles.editCancelButton, pressed && { opacity: 0.7 }]}
                      testID="admin-edit-cancel-button"
                    >
                      <X color="#C8AA94" size={16} />
                      <Text style={styles.editCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleSaveEdit}
                      style={({ pressed }) => [styles.editSaveButton, pressed && { opacity: 0.8 }]}
                      testID="admin-edit-save-button"
                    >
                      <Save color="#1A120E" size={16} />
                      <Text style={styles.editSaveText}>Save Changes</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </CollapsiblePanel>

            <CollapsiblePanel
              testID="admin-member-stats-panel"
              title="Visit & activity stats"
              copy="Activity summary and visit frequency for this member."
              icon={TrendingUp}
              iconColor="#22C55E"
            >
              <View style={styles.statsGrid}>
                <View style={styles.statCard}>
                  <TrendingUp color="#22C55E" size={18} />
                  <Text style={styles.statValue}>{stats.visitCount}</Text>
                  <Text style={styles.statLabel}>Visits</Text>
                </View>
                <View style={styles.statCard}>
                  <Star color="#F7C58B" size={18} />
                  <Text style={styles.statValue}>{formatPoints(stats.totalEarned)}</Text>
                  <Text style={styles.statLabel}>Earned</Text>
                </View>
                <View style={styles.statCard}>
                  <CircleDollarSign color="#F87171" size={18} />
                  <Text style={styles.statValue}>{formatPoints(stats.totalRedeemed)}</Text>
                  <Text style={styles.statLabel}>Redeemed</Text>
                </View>
                <View style={styles.statCard}>
                  <CircleDollarSign color="#60A5FA" size={18} />
                  <Text style={styles.statValue}>${stats.totalSpent.toFixed(0)}</Text>
                  <Text style={styles.statLabel}>Total spent</Text>
                </View>
              </View>

              {stats.lastVisit && (
                <View style={styles.lastVisitRow}>
                  <Clock color="#C8AA94" size={14} />
                  <Text style={styles.lastVisitText}>Last visit: {formatDateTime(stats.lastVisit)}</Text>
                </View>
              )}

              {stats.visitCount >= 5 && (
                <View style={styles.regularBadge}>
                  <Flame color="#F59E0B" size={16} />
                  <Text style={styles.regularBadgeText}>
                    {stats.visitCount >= 20 ? "VIP Regular" : stats.visitCount >= 10 ? "Frequent Visitor" : "Regular Customer"}
                  </Text>
                </View>
              )}
            </CollapsiblePanel>

            <CollapsiblePanel
              testID="admin-add-points-panel"
              title="Add points"
              copy={`Enter the sub-total (without tax & tips). Points auto-calculated at ${settings.pointsPerDollar} pts per $1.`}
              icon={Star}
              defaultOpen={true}
            >
              <InputField
                label="Sub-total amount ($) — exclude tax & tips"
                keyboardType="numeric"
                onChangeText={(v) => setDollarAmount(v.replace(/[^0-9.]/g, ""))}
                placeholder="45.50"
                testID="admin-dollar-input"
                value={dollarAmount}
              />
              <InputField
                label="Note (optional)"
                onChangeText={setNote}
                placeholder="e.g. Table 5 dinner"
                testID="admin-note-input"
                value={note}
              />

              {calculatedPoints > 0 && (
                <View style={styles.previewRow}>
                  <CircleDollarSign color="#F7C58B" size={16} />
                  <Text style={styles.previewText}>
                    ${parseFloat(dollarAmount).toFixed(2)} × {settings.pointsPerDollar} = {formatPoints(calculatedPoints)} points
                  </Text>
                </View>
              )}

              <ActionButton
                icon={Star}
                label={calculatedPoints > 0 ? `Add ${formatPoints(calculatedPoints)} points` : "Add points to member"}
                onPress={handleAddPoints}
                testID="admin-add-points-button"
                variant="primary"
              />
            </CollapsiblePanel>

            <CollapsiblePanel
              testID="admin-redeem-rewards-panel"
              title="Redeem rewards"
              copy={`Member has ${formatPoints(activePoints)} active points. Select a reward to redeem.`}
              icon={Gift}
              iconColor="#F59E0B"
            >
              <View style={styles.redeemPointsBadge}>
                <Star color="#F7C58B" size={16} />
                <Text style={styles.redeemPointsText}>{formatPoints(activePoints)} points available</Text>
              </View>

              {redeemableRewards.map((reward) => (
                <View key={reward.id}>
                  <View style={styles.redeemRewardCard}>
                    <View style={[styles.redeemAccent, { backgroundColor: reward.accent }]} />
                    <View style={styles.redeemBody}>
                      <Text style={styles.redeemTitle}>{reward.title}</Text>
                      <Text style={styles.redeemSubtitle}>{reward.subtitle}</Text>
                      <Text style={styles.redeemCost}>{formatPoints(reward.points)} pts required</Text>
                    </View>
                    <Pressable
                      onPress={() => handleStartRedeemVerify(reward.id, reward.title, reward.points)}
                      style={({ pressed }) => [
                        reward.canRedeem ? styles.redeemButton : styles.redeemButtonDisabled,
                        pressed && reward.canRedeem && { opacity: 0.8, transform: [{ scale: 0.96 }] },
                      ]}
                      disabled={!reward.canRedeem}
                      testID={`admin-redeem-${reward.id}`}
                    >
                      <Gift color={reward.canRedeem ? "#1A120E" : "#8E6D56"} size={14} />
                      <Text style={reward.canRedeem ? styles.redeemButtonText : styles.redeemButtonTextDisabled}>
                        Redeem
                      </Text>
                    </Pressable>
                  </View>

                  {redeemVerifyRewardId === reward.id && (
                    <View style={styles.redeemVerifySection}>
                      <View style={styles.redeemVerifyBanner}>
                        <MessageSquareMore color="#F59E0B" size={16} />
                        <Text style={styles.redeemVerifyBannerText}>
                          Send a verification code to {foundMember?.fullName}'s phone to confirm this redemption.
                        </Text>
                      </View>

                      {(redeemVerifyStep === "idle" || redeemVerifyStep === "sending") && (
                        <Pressable
                          onPress={handleSendRedeemCode}
                          style={({ pressed }) => [styles.sendVerifyButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                          testID={`admin-redeem-send-code-${reward.id}`}
                        >
                          <MessageSquareMore color="#1A120E" size={16} />
                          <Text style={styles.sendVerifyButtonText}>
                            {isSendingRedeemCode ? "Sending code..." : "Send verification to member"}
                          </Text>
                        </Pressable>
                      )}

                      {(redeemVerifyStep === "sent" || redeemVerifyStep === "verifying") && (
                        <>
                          <InputField
                            label="Enter 6-digit code from member"
                            keyboardType="numeric"
                            onChangeText={(v) => setRedeemVerifyCode(v.replace(/\D/g, "").slice(0, 6))}
                            placeholder="Enter 6-digit code"
                            testID={`admin-redeem-code-input-${reward.id}`}
                            value={redeemVerifyCode}
                          />
                          <View style={styles.redeemVerifyActions}>
                            <Pressable
                              onPress={handleSendRedeemCode}
                              style={({ pressed }) => [styles.resendCodeButton, pressed && { opacity: 0.7 }]}
                              testID={`admin-redeem-resend-${reward.id}`}
                            >
                              <MessageSquareMore color="#C8AA94" size={14} />
                              <Text style={styles.resendCodeText}>Resend</Text>
                            </Pressable>
                            <Pressable
                              onPress={handleVerifyAndRedeem}
                              style={({ pressed }) => [styles.verifyRedeemButton, pressed && { opacity: 0.8 }]}
                              testID={`admin-redeem-verify-${reward.id}`}
                            >
                              <CheckCircle2 color="#1A120E" size={16} />
                              <Text style={styles.verifyRedeemButtonText}>
                                {isVerifyingRedeem ? "Verifying..." : "Verify & Redeem"}
                              </Text>
                            </Pressable>
                          </View>
                        </>
                      )}

                      <Pressable
                        onPress={handleCancelRedeem}
                        style={({ pressed }) => [styles.cancelRedeemButton, pressed && { opacity: 0.7 }]}
                        testID={`admin-redeem-cancel-${reward.id}`}
                      >
                        <Text style={styles.cancelRedeemText}>Cancel</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ))}
            </CollapsiblePanel>

            <CollapsiblePanel
              testID="admin-remove-points-panel"
              title="Remove points"
              copy="Remove points in case of a mistake or correction."
              icon={Minus}
              iconColor="#F87171"
            >
              {!removeMode ? (
                <Pressable
                  onPress={() => setRemoveMode(true)}
                  style={({ pressed }) => [styles.removeToggleButton, pressed && { opacity: 0.8 }]}
                  testID="admin-remove-toggle-button"
                >
                  <Minus color="#F87171" size={18} />
                  <Text style={styles.removeToggleText}>Remove points from member</Text>
                </Pressable>
              ) : (
                <>
                  <InputField
                    label="Points to remove"
                    keyboardType="numeric"
                    onChangeText={(v) => setRemoveAmount(v.replace(/[^0-9]/g, ""))}
                    placeholder="100"
                    testID="admin-remove-amount-input"
                    value={removeAmount}
                  />
                  <InputField
                    label="Reason (optional)"
                    onChangeText={setRemoveNote}
                    placeholder="e.g. Incorrect amount entered"
                    testID="admin-remove-note-input"
                    value={removeNote}
                  />

                  {removeAmount && parseInt(removeAmount, 10) > 0 && (
                    <View style={styles.removePreviewRow}>
                      <Minus color="#F87171" size={16} />
                      <Text style={styles.removePreviewText}>
                        Removing {formatPoints(parseInt(removeAmount, 10))} points from {foundMember.fullName}
                      </Text>
                    </View>
                  )}

                  <View style={styles.removeActions}>
                    <Pressable
                      onPress={() => {
                        setRemoveMode(false);
                        setRemoveAmount("");
                        setRemoveNote("");
                      }}
                      style={({ pressed }) => [styles.removeCancelButton, pressed && { opacity: 0.7 }]}
                      testID="admin-remove-cancel-button"
                    >
                      <X color="#C8AA94" size={16} />
                      <Text style={styles.removeCancelText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleRemovePoints}
                      style={({ pressed }) => [styles.removeConfirmButton, pressed && { opacity: 0.8 }]}
                      testID="admin-remove-confirm-button"
                    >
                      <Minus color="#FFF" size={16} />
                      <Text style={styles.removeConfirmText}>Remove Points</Text>
                    </Pressable>
                  </View>
                </>
              )}
            </CollapsiblePanel>

            <CollapsiblePanel
              testID="admin-delete-member-panel"
              title="Delete member"
              copy="Permanently delete this member's account. This action cannot be undone."
              icon={Trash2}
              iconColor="#EF4444"
            >
              <View style={styles.deleteWarningBanner}>
                <Trash2 color="#F87171" size={18} />
                <Text style={styles.deleteWarningText}>
                  Deleting this account will permanently remove all of {foundMember.fullName}'s data including points balance, transaction history, and profile information.
                </Text>
              </View>
              <Pressable
                onPress={handleDeleteMember}
                style={({ pressed }) => [styles.deleteButton, pressed && { opacity: 0.8, transform: [{ scale: 0.98 }] }]}
                testID="admin-delete-member-button"
              >
                <Trash2 color="#FFF" size={16} />
                <Text style={styles.deleteButtonText}>Delete {foundMember.fullName}'s Account</Text>
              </Pressable>
            </CollapsiblePanel>

            {foundMember.pointsHistory.length > 0 && (
              <CollapsiblePanel
                testID="admin-history-panel"
                title="Points history"
                copy={`${foundMember.pointsHistory.length} transaction${foundMember.pointsHistory.length !== 1 ? "s" : ""} — ${stats.earnedCount} earned, ${stats.redeemedCount} redeemed.`}
                icon={Clock}
              >
                {foundMember.pointsHistory.slice(0, 10).map((entry) => (
                  <View key={entry.id} style={styles.historyRow}>
                    <View style={[styles.historyDot, entry.type === "redeemed" ? styles.historyDotRedeemed : undefined]} />
                    <View style={styles.historyContent}>
                      <View style={styles.historyTopRow}>
                        <Text style={styles.historyAmount}>
                          {entry.type === "redeemed" ? "−" : "+"}{formatPoints(Math.abs(entry.amount))} pts
                        </Text>
                        {entry.type === "earned" && (
                          <Text style={styles.historySpent}>${entry.dollarAmount.toFixed(2)}</Text>
                        )}
                      </View>
                      <Text style={styles.historyNote}>{entry.note}</Text>
                      <Text style={styles.historyDate}>{formatDateTime(entry.addedAt)}</Text>
                      {entry.type === "earned" && entry.expiresAt && (
                        <Text style={styles.historyExpiry}>
                          Expires: {formatDate(entry.expiresAt)}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </CollapsiblePanel>
            )}
          </>
        )}
      </LoyaltyScreen>
    </>
  );
}

const styles = StyleSheet.create({
  historyAmount: {
    color: "#F7C58B",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  historyContent: {
    flex: 1,
    gap: 2,
  },
  historyDate: {
    color: "#8E6D56",
    fontSize: 12,
  },
  historyExpiry: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  historyDot: {
    backgroundColor: "#22C55E",
    borderRadius: 999,
    height: 8,
    marginTop: 5,
    width: 8,
  },
  historyDotRedeemed: {
    backgroundColor: "#F87171",
  },
  historyNote: {
    color: "#C8AA94",
    fontSize: 13,
  },
  historyRow: {
    flexDirection: "row",
    gap: 12,
  },
  historyTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  historySpent: {
    color: "#8E6D56",
    fontSize: 12,
    fontWeight: "600" as const,
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
  memberAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 16,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  memberCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 14,
  },
  memberInfo: {
    flex: 1,
    gap: 6,
  },
  memberName: {
    color: "#FFF7ED",
    fontSize: 18,
    fontWeight: "800" as const,
  },
  tierBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderRadius: 8,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tierBadgeText: {
    color: "#F8E7D0",
    fontSize: 12,
    fontWeight: "700" as const,
  },
  tierDot: {
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  infoGrid: {
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  infoRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  infoIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 8,
    height: 28,
    justifyContent: "center",
    width: 28,
  },
  infoContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoLabel: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  infoValue: {
    color: "#FFF7ED",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  infoValueLarge: {
    color: "#F7C58B",
    fontSize: 18,
    fontWeight: "900" as const,
  },
  infoDivider: {
    backgroundColor: "rgba(247, 197, 139, 0.06)",
    height: 1,
    marginHorizontal: 14,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  statCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    minWidth: 100,
    paddingHorizontal: 8,
    paddingVertical: 14,
  },
  statValue: {
    color: "#FFF7ED",
    fontSize: 18,
    fontWeight: "900" as const,
  },
  statLabel: {
    color: "#C8AA94",
    fontSize: 11,
    fontWeight: "600" as const,
  },
  lastVisitRow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.03)",
    borderRadius: 10,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lastVisitText: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "600" as const,
  },
  regularBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(245, 158, 11, 0.1)",
    borderColor: "rgba(245, 158, 11, 0.25)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  regularBadgeText: {
    color: "#F59E0B",
    fontSize: 13,
    fontWeight: "800" as const,
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
  previewRow: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.08)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  previewText: {
    color: "#F8E7D0",
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  verifyBanner: {
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  verifyText: {
    color: "#86EFAC",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
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
  removeToggleButton: {
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.06)",
    borderColor: "rgba(248, 113, 113, 0.2)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  removeToggleText: {
    color: "#F87171",
    flex: 1,
    fontSize: 15,
    fontWeight: "700" as const,
  },
  removePreviewRow: {
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.08)",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  removePreviewText: {
    color: "#FCA5A5",
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  removeActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  removeCancelButton: {
    alignItems: "center",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  removeCancelText: {
    color: "#C8AA94",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  removeConfirmButton: {
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  removeConfirmText: {
    color: "#FFF",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  editToggleButton: {
    alignItems: "center",
    backgroundColor: "rgba(96, 165, 250, 0.06)",
    borderColor: "rgba(96, 165, 250, 0.2)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  editToggleIconWrap: {
    alignItems: "center",
    backgroundColor: "rgba(96, 165, 250, 0.1)",
    borderRadius: 14,
    height: 48,
    justifyContent: "center",
    width: 48,
  },
  editToggleTextWrap: {
    flex: 1,
    gap: 2,
  },
  editToggleTitle: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  editToggleSubtitle: {
    color: "#C8AA94",
    fontSize: 12,
  },
  editFieldLabel: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "700" as const,
    marginTop: 4,
  },
  birthdayRow: {
    flexDirection: "row",
    gap: 10,
  },
  birthdayField: {
    flex: 1,
  },
  editIdNote: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  editIdNoteText: {
    color: "#FCD34D",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  editCancelButton: {
    alignItems: "center",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editCancelText: {
    color: "#C8AA94",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  editSaveButton: {
    alignItems: "center",
    backgroundColor: "#60A5FA",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  editSaveText: {
    color: "#1A120E",
    fontSize: 14,
    fontWeight: "700" as const,
  },
  emailVerifiedBanner: {
    alignItems: "center",
    backgroundColor: "rgba(34, 197, 94, 0.08)",
    borderColor: "rgba(34, 197, 94, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emailUnverifiedBanner: {
    alignItems: "center",
    backgroundColor: "rgba(248, 113, 113, 0.06)",
    borderColor: "rgba(248, 113, 113, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emailVerifiedText: {
    color: "#86EFAC",
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  emailUnverifiedText: {
    color: "#FCA5A5",
    flex: 1,
    fontSize: 13,
    fontWeight: "700" as const,
  },
  redeemPointsBadge: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderColor: "rgba(247, 197, 139, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  redeemPointsText: {
    color: "#F7C58B",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  redeemRewardCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 14,
  },
  redeemAccent: {
    borderRadius: 999,
    height: 12,
    width: 12,
  },
  redeemBody: {
    flex: 1,
    gap: 3,
  },
  redeemTitle: {
    color: "#FFF7ED",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  redeemSubtitle: {
    color: "#C9AD99",
    fontSize: 12,
    lineHeight: 16,
  },
  redeemCost: {
    color: "#F7C58B",
    fontSize: 12,
    fontWeight: "700" as const,
    marginTop: 2,
  },
  redeemButton: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 12,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  redeemButtonDisabled: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  redeemButtonText: {
    color: "#1A120E",
    fontSize: 13,
    fontWeight: "800" as const,
  },
  redeemButtonTextDisabled: {
    color: "#8E6D56",
    fontSize: 13,
    fontWeight: "700" as const,
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
    gap: 8,
  },
  nameResultsCount: {
    color: "#C8AA94",
    fontSize: 12,
    fontWeight: "700" as const,
    marginBottom: 2,
  },
  nameResultCard: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.04)",
    borderColor: "rgba(247, 197, 139, 0.14)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  nameResultAvatar: {
    alignItems: "center",
    backgroundColor: "rgba(247, 197, 139, 0.1)",
    borderRadius: 12,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  nameResultInfo: {
    flex: 1,
    gap: 2,
  },
  nameResultName: {
    color: "#FFF7ED",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  nameResultPhone: {
    color: "#C8AA94",
    fontSize: 12,
  },
  deleteWarningBanner: {
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  deleteWarningText: {
    color: "#FCA5A5",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  deleteButton: {
    alignItems: "center",
    backgroundColor: "#DC2626",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  deleteButtonText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "800" as const,
  },
  redeemVerifySection: {
    backgroundColor: "rgba(245, 158, 11, 0.04)",
    borderColor: "rgba(245, 158, 11, 0.15)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 12,
    marginTop: 8,
    padding: 14,
  },
  redeemVerifyBanner: {
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  redeemVerifyBannerText: {
    color: "#FCD34D",
    flex: 1,
    fontSize: 13,
    fontWeight: "600" as const,
    lineHeight: 18,
  },
  sendVerifyButton: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 14,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  sendVerifyButtonText: {
    color: "#1A120E",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  redeemVerifyActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  resendCodeButton: {
    alignItems: "center",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  resendCodeText: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  verifyRedeemButton: {
    alignItems: "center",
    backgroundColor: "#F7C58B",
    borderRadius: 14,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  verifyRedeemButtonText: {
    color: "#1A120E",
    fontSize: 14,
    fontWeight: "800" as const,
  },
  cancelRedeemButton: {
    alignItems: "center",
    paddingVertical: 6,
  },
  cancelRedeemText: {
    color: "#C8AA94",
    fontSize: 13,
    fontWeight: "700" as const,
  },
});
