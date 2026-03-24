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
  requiredTiers?: string[];
}

export interface MemberPerk {
  id: string;
  title: string;
  description: string;
  accent: string;
  icon: string;
  validFrom?: string;
  validUntil?: string;
  requiredTiers?: string[];
  active: boolean;
}

export interface VisitBadge {
  id: string;
  name: string;
  minVisits: number;
}

export interface LoyaltyProgramSettings {
  pointsPerDollar: number;
  tiers: LoyaltyTier[];
  rewards: LoyaltyReward[];
  membershipRewards: MembershipReward[];
  memberPerks: MemberPerk[];
  termsAndConditions: string;
  privacyPolicy: string;
  tierBonusEnabled: boolean;
  visitBadges: VisitBadge[];
}

const DEFAULT_TERMS = `Terms and Conditions - Dae Bak Bon Ga Loyalty Program

1. ELIGIBILITY
The Dae Bak Bon Ga Loyalty Program is open to all customers aged 18 and older. Membership is free and requires a valid Canadian phone number (+1 country code). Only Canadian phone numbers are accepted for sign up and to receive SMS text message verifications. International phone numbers are not supported at this time.

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

10. MARKETING COMMUNICATIONS (SMS)
By signing up for the Dae Bak Bon Ga Loyalty Program, you are automatically opted-in to receive promotional text messages (SMS) including special deals, birthday rewards, points expiration reminders, and other marketing communications. No additional action is required to start receiving SMS messages upon registration. You may opt out of SMS marketing at any time through your profile settings in the app or by replying "STOP" to any message. Opting out of SMS marketing will not affect your membership status, earned points, or rewards.

11. PUSH NOTIFICATIONS
Upon signing up, your device is automatically opted-in and registered to receive push notifications from Dae Bak Bon Ga. Push notifications may include promotional offers, loyalty program updates, tier status changes, points reminders, and other marketing communications. No additional action is required to start receiving push notifications upon registration. You may opt out of push notifications at any time through the Member Options section in the app. Opting out of push notifications will not affect your membership status, earned points, or rewards. Dae Bak Bon Ga reserves the right to send essential account-related notifications (e.g., security alerts) regardless of your push notification preferences.

12. AUTOMATIC OPT-IN ACKNOWLEDGMENT
By creating a Dae Bak Bon Ga Loyalty Program account, you acknowledge and agree that both SMS marketing communications and push notifications are automatically enabled upon registration. You understand that you may opt out of either or both communication channels at any time without affecting your membership benefits.

By signing up, you acknowledge that you have read, understood, and agree to these terms and conditions, including the automatic opt-in for SMS and push notification communications.`;

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

Send you SMS notifications regarding your points, special promotions, and marketing communications. By signing up, you are automatically opted-in to receive SMS messages.

Send automated "Happy Birthday" messages and offers.

Improve our restaurant services and app experience.

3. SMS Marketing & Communication
By signing up for the loyalty program, you are automatically opted-in to receive text messages from Dae Bak Bon Ga. You consent to receive SMS communications including promotional offers, points updates, and marketing messages.

Automatic Opt-In: Upon registration, your phone number is automatically enrolled to receive SMS communications. No additional action is required to start receiving messages.

Frequency: Message frequency varies based on your activity (e.g., points earned) and monthly promotions.

Opt-Out: You can opt-out of SMS marketing at any time by updating your profile settings in the app or replying "STOP" to any mobile message. Opting out of SMS will not affect your membership status, points balance, or ability to redeem rewards.

Costs: Standard message and data rates may apply.

4. Push Notifications
Upon registration, your device is automatically opted-in and enrolled to receive push notifications from Dae Bak Bon Ga. No additional action is required to start receiving push notifications. These notifications may include:

Promotional offers and special deals.

Loyalty program updates (points earned, tier changes, reward availability).

Marketing campaigns and recurring promotional messages sent by Dae Bak Bon Ga.

Automatic Opt-In: Both SMS and push notifications are automatically enabled when you sign up for the loyalty program. You do not need to separately opt-in for either communication channel.

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

Opt out of push notifications and SMS marketing independently at any time, despite both being automatically opted-in upon registration.

8. Contact Us
If you have any questions about this Privacy Policy, please contact us at:
Dae Bak Bon Ga
main@dae-bak.com`;

export const DEFAULT_LOYALTY_PROGRAM_SETTINGS: LoyaltyProgramSettings = {
  pointsPerDollar: 8,
  termsAndConditions: DEFAULT_TERMS,
  privacyPolicy: DEFAULT_PRIVACY_POLICY,
  memberPerks: [
    {
      id: "happy-hour",
      title: "Happy Hour Special",
      description: "20% off all drinks every weekday 4-6 PM. Members only!",
      accent: "#F59E0B",
      icon: "beer",
      active: true,
    },
    {
      id: "birthday-bonus",
      title: "Birthday Month Treat",
      description: "Enjoy a complimentary dessert during your birthday month.",
      accent: "#FB7185",
      icon: "cake",
      active: true,
    },
    {
      id: "early-access",
      title: "Early Access to New Menu",
      description: "Be the first to try our seasonal menu items before public launch.",
      accent: "#60A5FA",
      icon: "sparkles",
      active: true,
    },
  ],
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
  visitBadges: [
    { id: "regular", name: "Regular Customer", minVisits: 5 },
    { id: "frequent", name: "Frequent Visitor", minVisits: 10 },
    { id: "vip-regular", name: "VIP Regular", minVisits: 20 },
  ],
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
