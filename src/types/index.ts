export type UserRole = 'user' | 'admin';

export type VerificationStatus = 'unverified' | 'philsys_pending' | 'philsys_approved' | 'biometric_pending' | 'fully_verified';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  trustScore: number;
  verificationStatus: VerificationStatus;
  avatarUrl?: string;
  createdAt: string;
}

export interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string;
  category: string;
  sellerId: string;
  sellerName: string;
  sellerTrustScore: number;
  sellerVerified: boolean;
  createdAt: string;
  status: 'active' | 'sold' | 'removed';
}

export interface Transaction {
  id: string;
  listingId: string;
  listingTitle: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  method: 'cod' | 'online';
  status: 'pending' | 'completed' | 'cancelled' | 'disputed';
  createdAt: string;
}

export interface VerificationRequest {
  id: string;
  userId: string;
  userName: string;
  type: 'philsys' | 'biometric';
  status: 'pending' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  philsysScreenshot?: string;
  idPhoto?: string;
  selfiePhoto?: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reporterName: string;
  reportedUserId: string;
  reportedUserName: string;
  reason: string;
  description: string;
  status: 'pending' | 'reviewed' | 'accepted' | 'dismissed';
  createdAt: string;
}
