import React, { useEffect, useRef } from "react";
import { Platform, StyleSheet, View } from "react-native";

const ADSENSE_CLIENT_ID = "ca-pub-7133225364355808";

function injectAdSenseScript(): void {
  if (Platform.OS !== "web") return;
  if (typeof document === "undefined") return;

  const existing = document.querySelector(
    `script[src*="pagead2.googlesyndication.com"]`
  );
  if (existing) return;

  const script = document.createElement("script");
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT_ID}`;
  script.async = true;
  script.crossOrigin = "anonymous";
  document.head.appendChild(script);
  console.log("[AdBanner] AdSense script injected");
}

export function AdBanner() {
  const adInitialized = useRef<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;

    injectAdSenseScript();

    const timer = setTimeout(() => {
      if (adInitialized.current) return;
      adInitialized.current = true;

      try {
        const adsbygoogle = (window as any).adsbygoogle;
        if (adsbygoogle) {
          adsbygoogle.push({});
          console.log("[AdBanner] Ad slot pushed");
        } else {
          console.log("[AdBanner] adsbygoogle not ready yet");
        }
      } catch (e) {
        console.log("[AdBanner] Error pushing ad:", e);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  if (Platform.OS !== "web") {
    return null;
  }

  return (
    <View style={styles.container} testID="ad-banner">
      <div
        style={{
          width: "100%",
          minHeight: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
        }}
      >
        <ins
          className="adsbygoogle"
          style={{
            display: "block",
            width: "100%",
            minHeight: 90,
          }}
          data-ad-client={ADSENSE_CLIENT_ID}
          data-ad-format="auto"
          data-full-width-responsive="true"
        />
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginTop: 4,
    overflow: "hidden",
  },
});
