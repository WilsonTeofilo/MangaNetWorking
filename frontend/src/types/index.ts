export type Genre = 
  | 'Ação'
  | 'Aventura'
  | 'Shonen'
  | 'Seinen'
  | 'Fantasia'
  | 'Sci-Fi'
  | 'Sobrenatural'
  | 'Mistério'
  | 'Drama'
  | 'Comédia';

export interface Chapter {
  id: string;
  workId: string;
  number: number;
  title: string;
  coverUrl?: string;
  pages: string[];
  createdAt: string; // ISO
  publicReleaseAt: string; // ISO when free users unlock it
  views: number;
  likes: number;
  commentsCount: number;
  format?: 'IMAGE_PAGES' | 'PROSE';
  content?: string;
}

export interface CreatorMission {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  completed: boolean;
  boostRewardMul: number; // e.g. 1.5x
  boostRewardHours: number; // e.g. 48h
}

export interface Creator {
  id: string;
  name: string;
  handle: string;
  avatarUrl: string;
  bio: string;
  pixKey: string;
  pixKeyType: 'cpf' | 'email' | 'telefone' | 'aleatoria';
  documentCpf: string;
  membershipPriceBrl: number; // Creator sets between 7.99 and 45.99
  monthlyMembersCount: number;
  totalDonationsBrl: number;
  walletBalanceBrl: number; // 83% net available for PIX payout
  pendingPayoutsBrl: number;
  worksCount: number;
  verified: boolean;
  // Algorithmic Engagement Boost (MangaTeofilo missions reward):
  engagementBoostMul: number; // e.g. 1.0 (normal) to 2.2 (active boost)
  engagementBoostUntil?: string; // ISO date
  missions: CreatorMission[];
}

export interface Work {
  id: string;
  slug: string;
  title: string;
  originalTitle?: string;
  authorId: string;
  authorName: string;
  coverUrl: string;
  bannerUrl: string;
  synopsis: string;
  genres: Genre[];
  status: 'ongoing' | 'completed' | 'hiatus';
  format?: 'MANGA' | 'LIGHT_NOVEL';
  totalChapters: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  rating: number;
  updatedAt: string; // ISO
  chapters?: Chapter[];
  // Algorithmic computed properties
  discoveryScore?: number;
  trendingScore?: number;
  isFreshRelease?: boolean;
  activeBoostMul?: number;
}

export interface Donation {
  id: string;
  workId?: string;
  chapterId?: string;
  creatorId: string;
  donorName: string;
  donorEmail?: string;
  amountBrl: number;
  platformFeeBrl: number; // 17%
  creatorNetBrl: number; // 83%
  message?: string;
  paymentMethod: 'pix' | 'cartao';
  status: 'approved' | 'pending';
  createdAt: string;
}

export interface MembershipSubscription {
  creatorId: string;
  priceBrl: number;
  startedAt: string;
  expiresAt: string;
  status: 'active' | 'cancelled';
}

export interface UserProfile {
  /** Identificador público e segunda via de login (único e imutável). */
  username?: string;
  /** Sexo declarado no perfil. */
  sex?: 'MASCULINO' | 'FEMININO' | 'OUTRO' | 'NAO_INFORMADO';
  /** Perfil visível para outras pessoas. */
  profilePublic?: boolean;
  /** O titular ja configurou o perfil (foto/visibilidade): o primeiro acesso nao repete. */
  profileOnboardingCompleted?: boolean;
  uid: string;
  name: string;
  email: string;
  avatarUrl: string;
  isCreator: boolean;
  isModerator?: boolean;
  isOwner?: boolean;
  creatorId?: string;
  /** Handle público do autor (@). */
  creatorHandle?: string;
  isVip?: boolean;
  vipExpiresAt?: string;
  privacyConsentRequired?: boolean;
  privacyPolicyVersion?: string;
  activeMemberships: Record<string, MembershipSubscription>; // creatorId -> subscription
  favorites: string[]; // workIds
}

export interface ReadingProgress {
  workId: string;
  workTitle: string;
  chapterId: string;
  chapterNumber: number;
  page: number;
  coverUrl: string;
  updatedAt: string;
}

export type ReportReason =
  | 'COPYRIGHT_PIRACY'
  | 'PORNOGRAPHY_HENTAI'
  | 'PLAGIARISM'
  | 'ABUSIVE_CONTENT'
  | 'OTHER';

export interface ReportPayload {
  workId: string;
  chapterId?: string;
  reason: ReportReason;
  description: string;
  reporterEmail?: string;
}
