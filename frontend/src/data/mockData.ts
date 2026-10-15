import { Creator, Work, Chapter, UserProfile } from '../types';

export const MOCK_CREATORS: Record<string, Creator> = {
  'creator-teofilo': {
    id: 'creator-teofilo',
    name: 'Teófilo (Shito Studio)',
    handle: '@shito_oficial',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    bio: 'Autor e desenhista independente. Criador do universo KOKUIN e Shito. Publicações semanais.',
    pixKey: 'teofilo.shito@manganetworking.com',
    pixKeyType: 'email',
    documentCpf: '123.456.789-00',
    membershipPriceBrl: 23.00, // Preço escolhido pelo autor (R$ 7,99 a R$ 45,99)
    monthlyMembersCount: 142,
    totalDonationsBrl: 3840.00,
    walletBalanceBrl: 1850.50, // 83% líquido para saque
    pendingPayoutsBrl: 0,
    worksCount: 2,
    verified: true,
    engagementBoostMul: 1.0, // Normal
    missions: [
      {
        id: 'm1',
        title: 'Manter Streak Semanal',
        description: 'Lançar ao menos 1 capítulo a cada 7 dias consecutivos.',
        progress: 1,
        target: 1,
        completed: true,
        boostRewardMul: 1.5,
        boostRewardHours: 48,
      },
      {
        id: 'm2',
        title: 'Responder 20 Comentários',
        description: 'Interagir com sua comunidade nos capítulos recentes.',
        progress: 14,
        target: 20,
        completed: false,
        boostRewardMul: 1.8,
        boostRewardHours: 72,
      }
    ]
  },
  'creator-renan': {
    id: 'creator-renan',
    name: 'Renan Sasaki',
    handle: '@sasaki_manga',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    bio: 'Mangaká focado em fantasia sombria e ação visceral. 100% independente.',
    pixKey: '11998765432',
    pixKeyType: 'telefone',
    documentCpf: '987.654.321-11',
    membershipPriceBrl: 15.90,
    monthlyMembersCount: 89,
    totalDonationsBrl: 1920.00,
    walletBalanceBrl: 940.20,
    pendingPayoutsBrl: 200.00,
    worksCount: 1,
    verified: true,
    // Bateu missão! Boost ativo estilo MangaTeofilo
    engagementBoostMul: 1.8,
    engagementBoostUntil: new Date(Date.now() + 36 * 3600000).toISOString(),
    missions: [
      {
        id: 'm-sasaki-1',
        title: 'Bater 500 Likes no Capítulo 04',
        description: 'Comunidade engajou e destravou o boost no feed!',
        progress: 500,
        target: 500,
        completed: true,
        boostRewardMul: 1.8,
        boostRewardHours: 36,
      }
    ]
  },
  'creator-bianca': {
    id: 'creator-bianca',
    name: 'Bianca Volt',
    handle: '@biancavolt',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&auto=format&fit=crop&q=80',
    bio: 'Ilustradora e roteirista de ficção científica cyberpunk e inteligência artificial.',
    pixKey: 'bianca.pix@voltmanga.br',
    pixKeyType: 'email',
    documentCpf: '456.789.123-33',
    membershipPriceBrl: 29.90,
    monthlyMembersCount: 215,
    totalDonationsBrl: 5410.00,
    walletBalanceBrl: 3120.80,
    pendingPayoutsBrl: 0,
    worksCount: 1,
    verified: true,
    engagementBoostMul: 1.4,
    engagementBoostUntil: new Date(Date.now() + 12 * 3600000).toISOString(),
    missions: [
      {
        id: 'm-bianca-1',
        title: 'Lançamento de Capítulo Duplo',
        description: 'Lançar 2 capítulos no mesmo mês.',
        progress: 2,
        target: 2,
        completed: true,
        boostRewardMul: 1.4,
        boostRewardHours: 24,
      }
    ]
  }
};

const NOW = Date.now();
const ONE_HOUR = 3600 * 1000;
const ONE_DAY = 24 * ONE_HOUR;

export const MOCK_CHAPTERS: Chapter[] = [
  // Obra: KOKUIN (author: creator-teofilo)
  {
    id: 'kokuin-cap-04',
    workId: 'kokuin',
    number: 4,
    title: 'O Despertar da Chama Negra',
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    pages: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(NOW - 6 * ONE_HOUR).toISOString(),
    // Data futura! Acesso antecipado para membros!
    publicReleaseAt: new Date(NOW + 4 * ONE_DAY).toISOString(),
    views: 430,
    likes: 88,
    commentsCount: 22
  },
  {
    id: 'kokuin-cap-03',
    workId: 'kokuin',
    number: 3,
    title: 'Ecos no Labirinto',
    coverUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=600&auto=format&fit=crop&q=80',
    pages: [
      'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(NOW - 7 * ONE_DAY).toISOString(),
    publicReleaseAt: new Date(NOW - 2 * ONE_DAY).toISOString(), // Já liberado
    views: 1240,
    likes: 195,
    commentsCount: 45
  },
  {
    id: 'kokuin-cap-02',
    workId: 'kokuin',
    number: 2,
    title: 'A Marca dos Esquecidos',
    coverUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=600&auto=format&fit=crop&q=80',
    pages: [
      'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(NOW - 15 * ONE_DAY).toISOString(),
    publicReleaseAt: new Date(NOW - 10 * ONE_DAY).toISOString(),
    views: 2450,
    likes: 310,
    commentsCount: 68
  },
  {
    id: 'kokuin-cap-01',
    workId: 'kokuin',
    number: 1,
    title: 'Prólogo: O Selo Quebrado',
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    pages: [
      'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(NOW - 30 * ONE_DAY).toISOString(),
    publicReleaseAt: new Date(NOW - 30 * ONE_DAY).toISOString(),
    views: 5800,
    likes: 890,
    commentsCount: 154
  },

  // Obra: A Lâmina Carmesim (author: creator-renan)
  {
    id: 'lamina-cap-05',
    workId: 'lamina-carmesim',
    number: 5,
    title: 'Fios de Sangue no Nevoeiro',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    pages: [
      'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200&auto=format&fit=crop&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(NOW - 3 * ONE_HOUR).toISOString(),
    // Data futura! Sai para o público em 5 dias!
    publicReleaseAt: new Date(NOW + 5 * ONE_DAY).toISOString(),
    views: 890,
    likes: 210,
    commentsCount: 56
  },
  {
    id: 'lamina-cap-04',
    workId: 'lamina-carmesim',
    number: 4,
    title: 'O Duelo na Ponte Quebrada',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    pages: [
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(NOW - 8 * ONE_DAY).toISOString(),
    publicReleaseAt: new Date(NOW - 1 * ONE_DAY).toISOString(),
    views: 3100,
    likes: 540,
    commentsCount: 88
  },

  // Obra: CyberRonin 2099 (author: creator-bianca)
  {
    id: 'cyber-cap-03',
    workId: 'cyber-ronin-2099',
    number: 3,
    title: 'Sobrecarga Neural em Neo-Kyoto',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    pages: [
      'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=1200&auto=format&fit=crop&q=80'
    ],
    createdAt: new Date(NOW - 18 * ONE_HOUR).toISOString(),
    // Publicação recente com lançamento antecipado
    publicReleaseAt: new Date(NOW + 2 * ONE_DAY).toISOString(),
    views: 1450,
    likes: 380,
    commentsCount: 92
  }
];

export const MOCK_WORKS: Work[] = [
  {
    id: 'kokuin',
    slug: 'kokuin',
    title: 'KOKUIN: A Chama do Abismo',
    originalTitle: '黒印の宿命',
    authorId: 'creator-teofilo',
    authorName: 'Teófilo (Shito Studio)',
    coverUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1600&auto=format&fit=crop&q=80',
    synopsis: 'Num império devastado por guerras místicas, uma linhagem proibida desperta o poder do Kokuin. Shito precisa dominar o estigma sombrio gravado em sua carne antes que as sombras da corte engulam sua terra natal.',
    genres: ['Shonen', 'Ação', 'Sobrenatural', 'Fantasia'],
    status: 'ongoing',
    totalChapters: 4,
    totalViews: 9920,
    totalLikes: 1483,
    totalComments: 289,
    rating: 4.9,
    updatedAt: new Date(NOW - 6 * ONE_HOUR).toISOString(), // Lançamento HOJE!
  },
  {
    id: 'lamina-carmesim',
    slug: 'lamina-carmesim',
    title: 'A Lâmina Carmesim',
    originalTitle: '紅の刃',
    authorId: 'creator-renan',
    authorName: 'Renan Sasaki',
    coverUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1600&auto=format&fit=crop&q=80',
    synopsis: 'Após a queda do clã Kurogane, um espadachim solitário perambula pelo arquipélago selando maldições que se alimentam do sangue de guerreiros caídos. Apenas os membros de seu clã conhecem a verdadeira lâmina.',
    genres: ['Seinen', 'Ação', 'Drama'],
    status: 'ongoing',
    totalChapters: 5,
    totalViews: 7420,
    totalLikes: 1120,
    totalComments: 198,
    rating: 4.8,
    updatedAt: new Date(NOW - 3 * ONE_HOUR).toISOString(), // Lançamento fresquíssimo + Boost 1.8x!
  },
  {
    id: 'cyber-ronin-2099',
    slug: 'cyber-ronin-2099',
    title: 'CyberRonin 2099',
    originalTitle: 'サイバー浪人',
    authorId: 'creator-bianca',
    authorName: 'Bianca Volt',
    coverUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1600&auto=format&fit=crop&q=80',
    synopsis: 'Em uma megalópole flutuante dominada por conglomerados sintéticos, uma inteligência artificial renegada assume o chassi de um ciborgue de combate para vingar a memória dos artesãos esquecidos.',
    genres: ['Sci-Fi', 'Ação', 'Seinen'],
    status: 'ongoing',
    totalChapters: 3,
    totalViews: 4890,
    totalLikes: 820,
    totalComments: 145,
    rating: 4.7,
    updatedAt: new Date(NOW - 18 * ONE_HOUR).toISOString(),
  },
  {
    id: 'eco-das-estrelas',
    slug: 'eco-das-estrelas',
    title: 'O Eco das Estrelas Esquecidas',
    originalTitle: '星々の残響',
    authorId: 'creator-teofilo',
    authorName: 'Teófilo (Shito Studio)',
    coverUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&auto=format&fit=crop&q=80',
    bannerUrl: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?w=1600&auto=format&fit=crop&q=80',
    synopsis: 'Uma saga poética e melancólica sobre a última navegadora dos céus e sua busca pelas constelações apagadas pelos antigos deuses mecânicos.',
    genres: ['Fantasia', 'Aventura', 'Mistério'],
    status: 'ongoing',
    totalChapters: 1,
    totalViews: 2100,
    totalLikes: 410,
    totalComments: 76,
    rating: 4.6,
    updatedAt: new Date(NOW - 14 * ONE_DAY).toISOString(),
  }
];

export const CURRENT_USER: UserProfile = {
  uid: 'user-demo-leitor',
  name: 'Lucas Ferreira',
  email: 'lucas.leitor@gmail.com',
  avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
  isCreator: false,
  creatorId: undefined,
  activeMemberships: {}, // Inicia sem ser membro para que o usuário possa testar o modal de bloqueio!
  favorites: ['kokuin', 'lamina-carmesim']
};
