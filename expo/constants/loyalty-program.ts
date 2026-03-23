import type { RewardItem } from "@/components/loyalty/ui";

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  accent: string;
  bonusPoints: number;
}

export interface LoyaltyReward extends RewardItem {}

export interface MembershipReward {
  id: string;
  title: string;
  subtitle: string;
  accent: string;
  visibleTiers?: string[];
}

export interface LoyaltyProgramSettings {
  pointsPerDollar: number;
  tiers: LoyaltyTier[];
  rewards: LoyaltyReward[];
  membershipRewards: MembershipReward[];
  termsAndConditions: string;
  privacyPolicy: string;
  tierBonusEnabled: boolean;
}

const DEFAULT_TERMS = `Terms and Conditions - Dae Bak Bon Ga Loyalty Program

1. ELIGIBILITY
The Dae Bak Bon Ga Loyalty Program is open to all customers aged 18 and older. Membership is free and requires a valid phone number and email address.

2. EARNING POINTS
Members earn points based on the current points-per-dollar rate set by the restaurant. Points are added by staff at the time of purchase. Points are non-transferable between members.

3. POINT EXPIRATION
All earned points expire one (1) year from the date they were awarded. Expired points cannot be reinstated.

4. REDEEMING REWARDS
Members may redeem points for available rewards as listed in the app. Rewards are subject to availability and may change at the restaurant's discretion. Redeemed points cannot be reversed.

5. MEMBERSHIP TIERS
Tier status is determined by total active points. Tier benefits and thresholds may be adjusted by the restaurant at any time.

6. ACCOUNT MANAGEMENT
Members are responsible for keeping their contact information up to date. The restaurant reserves the right to suspend or terminate accounts suspected of fraud or abuse.

7. PRIVACY
Personal information collected is used solely for the purpose of managing the loyalty program. We do not sell or share member data with third parties.

8. CHANGES TO TERMS
Dae Bak Bon Ga reserves the right to modify these terms at any time. Members will be notified of significant changes through the app.

9. LIMITATION OF LIABILITY
Dae Bak Bon Ga is not responsible for any technical issues that may affect point balances or reward redemption. The restaurant's decision on all loyalty program matters is final.

10. MARKETING COMMUNICATIONS
By signing up for the Dae Bak Bon Ga Loyalty Program, you agree to receive promotional text messages including special deals, birthday rewards, and points expiration reminders. You may opt out of marketing messages at any time through your profile settings in the app. Opting out of marketing messages will not affect your membership status or earned rewards.

11. PUSH NOTIFICATIONS
Upon signing up, your device will be automatically registered to receive push notifications from Dae Bak Bon Ga. Push notifications may include promotional offers, loyalty program updates, tier status changes, points reminders, and other marketing communications. You may opt out of push notifications at any time through the Member Options section in the app. Opting out of push notifications will not affect your membership status, earned points, or rewards. Dae Bak Bon Ga reserves the right to send essential account-related notifications (e.g., security alerts) regardless of your push notification preferences.

By signing up, you acknowledge that you have read, understood, and agree to these terms and conditions.`;

const DEFAULT_PRIVACY_POLICY = `Privacy Policy
Last Updated: March 21, 2026

At Dae Bak Bon Ga, we value your privacy. This Privacy Policy explains how we collect, use, and protect your information when you use our Loyalty App.

1. Information We Collect
We collect information that you voluntarily provide to us when you register for our loyalty program, including:

Personal Identifiers: Name and Phone Number.

Demographic Data: Birthdate (used solely for birthday rewards).

Usage Data: Points earned, rewards redeemed, and visit history.

2. How We Use Your Information
We use your data to:

Manage your loyalty points and rewards.

Send you SMS notifications regarding your points or special promotions (if you opted-in).

Send automated "Happy Birthday" messages and offers.

Improve our restaurant services and app experience.

3. SMS Marketing & Communication
By providing your phone number and opting in, you consent to receive text messages from us.

Frequency: Message frequency varies based on your activity (e.g., points earned) and monthly promotions.

Opt-Out: You can opt-out of marketing texts at any time by updating your profile settings in the app or replying "STOP" to any mobile message.

Costs: Standard message and data rates may apply.

4. Push Notifications
Upon registration, your device is automatically enrolled to receive push notifications. These notifications may include:

Promotional offers and special deals.

Loyalty program updates (points earned, tier changes, reward availability).

Marketing campaigns and recurring promotional messages sent by Dae Bak Bon Ga.

Opt-Out: You can disable push notifications at any time through the Member Options section within the app. Disabling push notifications will not affect your loyalty membership, points balance, or ability to redeem rewards.

Device Tokens: We collect and store your device's push notification token solely for the purpose of delivering notifications. This token is not shared with third parties for marketing purposes.

5. Third-Party Sharing
We do not sell or rent your personal information. We only share data with trusted service providers necessary to run the app, such as:

Supabase: For secure database storage.

Twilio: For delivering SMS notifications.

Expo Push Notifications: For delivering push notifications to your device.

Google AdSense: To show relevant advertisements (if applicable).

6. Data Security
We implement industry-standard security measures (via Supabase) to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.

7. Your Rights
You have the right to:

Access the personal data we hold about you.

Request the correction or deletion of your data.

Withdraw consent for marketing communications at any time.

Opt out of push notifications and SMS marketing independently.

8. Contact Us
If you have any questions about this Privacy Policy, please contact us at:
Dae Bak Bon Ga
main@dae-bak.com`;

export const DEFAULT_LOYALTY_PROGRAM_SETTINGS: LoyaltyProgramSettings = {
  pointsPerDollar: 8,
  termsAndConditions: DEFAULT_TERMS,
  privacyPolicy: DEFAULT_PRIVACY_POLICY,
  membershipRewards: [
    {
      id: "welcome-drink",
      title: "Welcome Drink",
      subtitle: "Complimentary soft drink for new members",
      accent: "#34D399",
    },
  ],
  tiers: [
    {
      id: "ember",
      name: "Ember",
      minPoints: 0,
      accent: "#F59E0B",
      bonusPoints: 0,
    },
    {
      id: "sear",
      name: "Sear",
      minPoints: 600,
      accent: "#FB7185",
      bonusPoints: 50,
    },
    {
      id: "dae-bak-vip",
      name: "Dae Bak VIP",
      minPoints: 1400,
      accent: "#F97316",
      bonusPoints: 150,
    },
  ],
  tierBonusEnabled: true,
  rewards: [
    {
      id: "banchan",
      title: "Free Banchan Upgrade",
      points: 120,
      subtitle: "Chef's rotating premium side dish",
      accent: "#F59E0B",
    },
    {
      id: "soju",
      title: "House Soju Flight",
      points: 280,
      subtitle: "Redeem on tables of 2 or more",
      accent: "#FB7185",
    },
    {
      id: "bbq",
      title: "Galbi Signature Plate",
      points: 480,
      subtitle: "Our top tier grilled favorite",
      accent: "#F97316",
    },
  ],
};
