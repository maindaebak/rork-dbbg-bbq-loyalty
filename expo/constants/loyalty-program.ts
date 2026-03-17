import type { RewardItem } from "@/components/loyalty/ui";

export interface LoyaltyTier {
  id: string;
  name: string;
  minPoints: number;
  accent: string;
}

export interface LoyaltyReward extends RewardItem {}

export interface LoyaltyProgramSettings {
  pointsPerDollar: number;
  tiers: LoyaltyTier[];
  rewards: LoyaltyReward[];
  termsAndConditions: string;
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

By signing up, you acknowledge that you have read, understood, and agree to these terms and conditions.`;

export const DEFAULT_LOYALTY_PROGRAM_SETTINGS: LoyaltyProgramSettings = {
  pointsPerDollar: 8,
  termsAndConditions: DEFAULT_TERMS,
  tiers: [
    {
      id: "ember",
      name: "Ember",
      minPoints: 0,
      accent: "#F59E0B",
    },
    {
      id: "sear",
      name: "Sear",
      minPoints: 600,
      accent: "#FB7185",
    },
    {
      id: "dae-bak-vip",
      name: "Dae Bak VIP",
      minPoints: 1400,
      accent: "#F97316",
    },
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
