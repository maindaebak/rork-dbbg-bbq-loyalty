import { ChevronDown, Search, X } from "lucide-react-native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  COUNTRY_CODES,
  DEFAULT_COUNTRY_CODE,
  type CountryCode,
} from "@/constants/country-codes";

interface PhoneInputProps {
  countryCode: CountryCode;
  onCountryCodeChange: (cc: CountryCode) => void;
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  testID: string;
}

export function PhoneInput({
  countryCode,
  onCountryCodeChange,
  phoneNumber,
  onPhoneNumberChange,
  testID,
}: PhoneInputProps) {
  const [pickerVisible, setPickerVisible] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const listRef = useRef<FlatList<CountryCode>>(null);
  const insets = useSafeAreaInsets();

  const filteredCodes = useMemo(() => {
    if (!search.trim()) return COUNTRY_CODES;
    const q = search.toLowerCase();
    return COUNTRY_CODES.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.dial.includes(q),
    );
  }, [search]);

  const closePicker = useCallback(() => {
    Keyboard.dismiss();
    setPickerVisible(false);
    setSearch("");
  }, []);

  const handleSelect = useCallback(
    (cc: CountryCode) => {
      onCountryCodeChange(cc);
      closePicker();
    },
    [onCountryCodeChange, closePicker],
  );

  const handlePhoneChange = useCallback(
    (value: string) => {
      const digits = value.replace(/[^\d]/g, "");
      onPhoneNumberChange(digits.slice(0, 15));
    },
    [onPhoneNumberChange],
  );

  const renderItem = useCallback(
    ({ item }: { item: CountryCode }) => (
      <Pressable
        onPress={() => handleSelect(item)}
        style={({ pressed }) => [
          pickerStyles.item,
          pressed && pickerStyles.itemPressed,
          item.code === countryCode.code && pickerStyles.itemSelected,
        ]}
        testID={`${testID}-country-${item.code}`}
      >
        <Text style={pickerStyles.itemFlag}>{item.flag}</Text>
        <Text style={pickerStyles.itemCode}>{item.code}</Text>
        <Text style={pickerStyles.itemDial}>{item.dial}</Text>
      </Pressable>
    ),
    [countryCode.code, handleSelect, testID],
  );

  const keyExtractor = useCallback((item: CountryCode) => `${item.code}-${item.dial}`, []);

  return (
    <View style={styles.wrapper} testID={`${testID}-wrap`}>
      <Text style={styles.label}>Phone number</Text>
      <View style={styles.row}>
        <Pressable
          onPress={() => setPickerVisible(true)}
          style={({ pressed }) => [
            styles.countryButton,
            pressed && styles.countryButtonPressed,
          ]}
          testID={`${testID}-country-picker`}
        >
          <Text style={styles.flag}>{countryCode.flag}</Text>
          <Text style={styles.dial}>{countryCode.dial}</Text>
          <ChevronDown color="#C8AA94" size={14} />
        </Pressable>
        <TextInput
          keyboardType="phone-pad"
          onChangeText={handlePhoneChange}
          placeholder="Phone number"
          placeholderTextColor="#8E6D56"
          style={styles.input}
          testID={testID}
          value={phoneNumber}
        />
      </View>

      <Modal
        animationType="slide"
        onRequestClose={closePicker}
        transparent
        visible={pickerVisible}
        statusBarTranslucent
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={pickerStyles.keyboardAvoid}
        >
          <Pressable
            onPress={closePicker}
            style={pickerStyles.overlay}
          >
            <View style={[pickerStyles.sheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
              <View style={pickerStyles.handle} />
              <Text style={pickerStyles.title}>Select country code</Text>
              <View style={pickerStyles.searchRow}>
                <Search color="#8E6D56" size={16} />
                <TextInput
                  onChangeText={setSearch}
                  placeholder="Search country or code..."
                  placeholderTextColor="#8E6D56"
                  style={pickerStyles.searchInput}
                  testID={`${testID}-country-search`}
                  value={search}
                  returnKeyType="done"
                />
                {search.length > 0 && (
                  <Pressable onPress={() => setSearch("")} hitSlop={8}>
                    <X color="#8E6D56" size={16} />
                  </Pressable>
                )}
              </View>
              <FlatList
                ref={listRef}
                data={filteredCodes}
                keyExtractor={keyExtractor}
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                style={pickerStyles.list}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                removeClippedSubviews={Platform.OS !== "web"}
                getItemLayout={(_data, index) => ({
                  length: ITEM_HEIGHT,
                  offset: ITEM_HEIGHT * index,
                  index,
                })}
                initialNumToRender={15}
                maxToRenderPerBatch={20}
                windowSize={7}
              />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const ITEM_HEIGHT = 48;

export { DEFAULT_COUNTRY_CODE, type CountryCode };

const styles = StyleSheet.create({
  countryButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  countryButtonPressed: {
    opacity: 0.7,
  },
  dial: {
    color: "#F8E7D0",
    fontSize: 15,
    fontWeight: "600" as const,
  },
  flag: {
    fontSize: 18,
  },
  input: {
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    color: "#FFF7ED",
    flex: 1,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  label: {
    color: "#F8E7D0",
    fontSize: 13,
    fontWeight: "700" as const,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  wrapper: {
    gap: 8,
  },
});

const pickerStyles = StyleSheet.create({
  handle: {
    alignSelf: "center",
    backgroundColor: "rgba(247, 197, 139, 0.3)",
    borderRadius: 3,
    height: 5,
    marginBottom: 12,
    width: 40,
  },
  item: {
    alignItems: "center",
    borderRadius: 12,
    flexDirection: "row",
    gap: 12,
    height: ITEM_HEIGHT,
    paddingHorizontal: 14,
  },
  itemCode: {
    color: "#F8E7D0",
    fontSize: 15,
    fontWeight: "700" as const,
    minWidth: 36,
  },
  itemDial: {
    color: "#C8AA94",
    fontSize: 15,
  },
  itemFlag: {
    fontSize: 22,
  },
  itemPressed: {
    backgroundColor: "rgba(247, 197, 139, 0.08)",
  },
  itemSelected: {
    backgroundColor: "rgba(247, 197, 139, 0.12)",
  },
  keyboardAvoid: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  overlay: {
    backgroundColor: "rgba(0,0,0,0.6)",
    flex: 1,
    justifyContent: "flex-end",
  },
  searchRow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 247, 237, 0.06)",
    borderColor: "rgba(247, 197, 139, 0.12)",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  searchInput: {
    color: "#FFF7ED",
    flex: 1,
    fontSize: 15,
    padding: 0,
  },
  sheet: {
    backgroundColor: "#1A120E",
    borderColor: "rgba(247, 197, 139, 0.18)",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    maxHeight: "70%",
    paddingHorizontal: 18,
    paddingTop: 14,
  },
  title: {
    color: "#FFF7ED",
    fontSize: 18,
    fontWeight: "800" as const,
    marginBottom: 14,
    textAlign: "center",
  },
});
