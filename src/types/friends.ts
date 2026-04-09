export interface Friendship {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted';
  created_at: string;
}

export interface FriendProfile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  referral_code: string | null;
}

export interface SharedCourse {
  id: string;
  course_id: string;
  shared_by: string;
  shared_with: string;
  message: string;
  created_at: string;
}

export interface ReferralReward {
  id: string;
  referrer_id: string;
  referred_id: string;
  referrer_rewarded_at: string | null;
  referred_converted_at: string | null;
  days_granted: number;
  created_at: string;
}
