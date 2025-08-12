import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ImageBackground,
  TouchableOpacity,
  TouchableNativeFeedback,
  RefreshControl,
  TextInput,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

/**
 * DiscoverScreen — Fil de découverte “façon Facebook”, lecture seule (admins publient).
 * Style: Material/Flat sans aucune ombre (no shadow, no elevation).
 * - Hiérarchie par surfaces tonales et contours fins (outlined).
 * - Posts variés: product, article, collection, hero, tip, shop-the-look, poll (readonly).
 * - Pull-to-refresh + scroll infini (mock data ici; branche ton backend plus tard).
 * - Compliant accessibilité (contrastes, tailles, hit targets).
 */

type PostBase = {
  id: string;
  author: { name: string; avatar: string };
  createdAt: string; // ISO
  likes: number;
  comments: number;
  shares: number;
};

type Product = {
  id: string;
  title: string;
  price: number;
  image: string;
  category?: string;
  rating?: number;
};

type ProductPost = PostBase & {
  type: 'product';
  product: Product;
  caption?: string;
};

type ArticlePost = PostBase & {
  type: 'article';
  title: string;
  cover: string;
  excerpt: string;
  link?: string;
};

type CollectionPost = PostBase & {
  type: 'collection';
  title: string;
  cover: string;
  products: Product[];
};

type HeroPost = PostBase & {
  type: 'hero';
  title: string;
  subtitle?: string;
  image: string;
  cta?: string;
};

type TipPost = PostBase & {
  type: 'tip';
  title: string;
  body: string;
  icon?: string;
};

type ShopLookPost = PostBase & {
  type: 'shoplook';
  title: string;
  products: Product[];
};

type PollPost = PostBase & {
  type: 'poll';
  question: string;
  options: { id: string; label: string; votes: number }[];
  totalVotes: number;
};

type Post = ProductPost | ArticlePost | CollectionPost | HeroPost | TipPost | ShopLookPost | PollPost;

const { width } = Dimensions.get('window');
const GUTTER = 16;

// Design tokens (simples) — adapte-les à ta palette globale si besoin
const TOKENS = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  surfaceVariant: '#F4F6F9',
  outline: '#E3E6EB',
  text: '#0F172A',
  textSubtle: '#6B7280',
  textMuted: '#98A2B3',
  accent: '#111827',
  overlay: 'rgba(0,0,0,0.25)',
};

// Lecture seule: pas de composer visible aux utilisateurs
const adminOnlyPost = true;

/** -------- Shimmer Skeleton (low-contrast) -------- */
const useShimmer = () => {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(v, { toValue: 1, duration: 1200, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  const translateX = v.interpolate({ inputRange: [0, 1], outputRange: [-80, 80] });
  return { translateX };
};

const Skeleton = ({ height, radius = 16, style }: { height: number; radius?: number; style?: any }) => {
  const { translateX } = useShimmer();
  return (
    <View
      style={[
        {
          height,
          backgroundColor: TOKENS.surfaceVariant,
          borderRadius: radius,
          overflow: 'hidden',
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: TOKENS.outline,
        },
        style,
      ]}
    >
      <Animated.View
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: 120,
          backgroundColor: '#FFFFFF',
          opacity: 0.25,
          transform: [{ translateX }],
        }}
      />
    </View>
  );
};

/** -------- UI utils -------- */
const Avatar = ({ uri, size = 40 }: { uri: string; size?: number }) => (
  <Image
    source={{ uri }}
    style={{
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: TOKENS.surfaceVariant,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: TOKENS.outline,
    }}
  />
);

const RippleBtn: React.FC<{ onPress?: () => void; style?: any; children: React.ReactNode }> = ({
  onPress,
  style,
  children,
}) => {
  if (Platform.OS === 'android') {
    return (
      <TouchableNativeFeedback onPress={onPress} background={TouchableNativeFeedback.Ripple('rgba(0,0,0,0.08)', false)}>
        <View style={style}>{children}</View>
      </TouchableNativeFeedback>
    );
  }
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={style}>
      {children}
    </TouchableOpacity>
  );
};

const Toolbar = ({
  onLike,
  onComment,
  onShare,
}: {
  onLike: () => void;
  onComment: () => void;
  onShare: () => void;
}) => (
  <View style={styles.toolbar}>
    <RippleBtn onPress={onLike} style={styles.toolbarBtn}>
      <Text style={styles.toolbarTxt}>👍 J’aime</Text>
    </RippleBtn>
    <RippleBtn onPress={onComment} style={styles.toolbarBtn}>
      <Text style={styles.toolbarTxt}>💬 Commenter</Text>
    </RippleBtn>
    <RippleBtn onPress={onShare} style={styles.toolbarBtn}>
      <Text style={styles.toolbarTxt}>↗️ Partager</Text>
    </RippleBtn>
  </View>
);

const PostHeader = ({ author, createdAt }: { author: PostBase['author']; createdAt: string }) => (
  <View style={styles.postHeader}>
    <Avatar uri={author.avatar} />
    <View style={{ flex: 1 }}>
      <Text style={styles.author}>{author.name}</Text>
      <Text style={styles.meta}>{formatTimeAgo(createdAt)}</Text>
    </View>
    <Text style={styles.more}>⋯</Text>
  </View>
);

/** -------- Cartes (outlined, sans ombres) -------- */
const ProductCard = ({ p, onPress }: { p: Product; onPress: () => void }) => (
  <RippleBtn onPress={onPress} style={styles.productCard}>
    <Image source={{ uri: p.image }} style={styles.productImage} />
    <View style={styles.productBody}>
      <Text numberOfLines={2} style={styles.productTitle}>
        {p.title}
      </Text>
      <Text style={styles.productPrice}>{formatPrice(p.price)}</Text>
    </View>
  </RippleBtn>
);

const ProductPostCard = ({ post, onOpen }: { post: ProductPost; onOpen: () => void }) => (
  <View style={styles.post}>
    <PostHeader author={post.author} createdAt={post.createdAt} />
    {!!post.caption && <Text style={styles.caption}>{post.caption}</Text>}
    <ProductCard p={post.product} onPress={onOpen} />
    <Counts likes={post.likes} comments={post.comments} shares={post.shares} />
    <Toolbar onLike={() => {}} onComment={() => {}} onShare={() => {}} />
  </View>
);

const ArticlePostCard = ({ post }: { post: ArticlePost }) => (
  <View style={styles.post}>
    <PostHeader author={post.author} createdAt={post.createdAt} />
    <Text style={styles.articleTitle} numberOfLines={3}>
      {post.title}
    </Text>
    <Image source={{ uri: post.cover }} style={styles.articleCover} />
    <Text style={styles.articleExcerpt} numberOfLines={3}>
      {post.excerpt}
    </Text>
    <Counts likes={post.likes} comments={post.comments} shares={post.shares} />
    <Toolbar onLike={() => {}} onComment={() => {}} onShare={() => {}} />
  </View>
);

const CollectionPostCard = ({ post, onOpen }: { post: CollectionPost; onOpen: (p: Product) => void }) => (
  <View style={styles.post}>
    <PostHeader author={post.author} createdAt={post.createdAt} />
    <Text style={styles.collectionTitle}>{post.title}</Text>
    <View style={styles.collectionGrid}>
      {post.products.slice(0, 4).map((p) => (
        <RippleBtn key={p.id} onPress={() => onOpen(p)} style={styles.collectionItem}>
          <Image source={{ uri: p.image }} style={styles.collectionImg} />
        </RippleBtn>
      ))}
    </View>
    <Counts likes={post.likes} comments={post.comments} shares={post.shares} />
    <Toolbar onLike={() => {}} onComment={() => {}} onShare={() => {}} />
  </View>
);

const HeroPostCard = ({ post }: { post: HeroPost }) => (
  <View style={styles.post}>
    <PostHeader author={post.author} createdAt={post.createdAt} />
    <ImageBackground source={{ uri: post.image }} style={styles.hero} imageStyle={{ borderRadius: 18 }}>
      <View style={styles.heroOverlay} />
      <View style={styles.heroContent}>
        <Text style={styles.heroTitle}>{post.title}</Text>
        {!!post.subtitle && <Text style={styles.heroSubtitle}>{post.subtitle}</Text>}
        {!!post.cta && (
          <RippleBtn style={styles.heroCta}>
            <Text style={styles.heroCtaText}>{post.cta}</Text>
          </RippleBtn>
        )}
      </View>
    </ImageBackground>
    <Counts likes={post.likes} comments={post.comments} shares={post.shares} />
    <Toolbar onLike={() => {}} onComment={() => {}} onShare={() => {}} />
  </View>
);

const TipPostCard = ({ post }: { post: TipPost }) => (
  <View style={styles.post}>
    <PostHeader author={post.author} createdAt={post.createdAt} />
    <View style={styles.tipWrap}>
      <Text style={styles.tipIcon}>{post.icon ?? '💡'}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.tipTitle}>{post.title}</Text>
        <Text style={styles.tipBody}>{post.body}</Text>
      </View>
    </View>
    <Counts likes={post.likes} comments={post.comments} shares={post.shares} />
    <Toolbar onLike={() => {}} onComment={() => {}} onShare={() => {}} />
  </View>
);

const ShopLookPostCard = ({ post, onOpen }: { post: ShopLookPost; onOpen: (p: Product) => void }) => (
  <View style={styles.post}>
    <PostHeader author={post.author} createdAt={post.createdAt} />
    <Text style={styles.collectionTitle}>{post.title}</Text>
    <FlatList
      horizontal
      data={post.products}
      keyExtractor={(x) => x.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 4, gap: 10 }}
      renderItem={({ item }) => (
        <RippleBtn onPress={() => onOpen(item)} style={styles.lookCard}>
          <Image source={{ uri: item.image }} style={styles.lookImg} />
          <Text numberOfLines={1} style={styles.lookTitle}>
            {item.title}
          </Text>
          <Text style={styles.lookPrice}>{formatPrice(item.price)}</Text>
        </RippleBtn>
      )}
    />
    <Counts likes={post.likes} comments={post.comments} shares={post.shares} />
    <Toolbar onLike={() => {}} onComment={() => {}} onShare={() => {}} />
  </View>
);

const PollPostCard = ({ post }: { post: PollPost }) => {
  const ratio = (v: number) => (post.totalVotes ? Math.round((v / post.totalVotes) * 100) : 0);
  return (
    <View style={styles.post}>
      <PostHeader author={post.author} createdAt={post.createdAt} />
      <Text style={styles.articleTitle}>{post.question}</Text>
      <View style={{ marginTop: 10, gap: 10 }}>
        {post.options.map((op) => (
          <View key={op.id} style={styles.pollRow}>
            <View style={styles.pollBarBg}>
              <View style={[styles.pollBarFill, { width: `${ratio(op.votes)}%` }]} />
            </View>
            <Text style={styles.pollLabel}>
              {op.label} • {ratio(op.votes)}%
            </Text>
          </View>
        ))}
      </View>
      <Text style={styles.pollMeta}>{post.totalVotes} votes</Text>
      <Counts likes={post.likes} comments={post.comments} shares={post.shares} />
      <Toolbar onLike={() => {}} onComment={() => {}} onShare={() => {}} />
    </View>
  );
};

const Counts = ({ likes, comments, shares }: { likes: number; comments: number; shares: number }) => (
  <View style={styles.counts}>
    <Text style={styles.countTxt}>{likes} j’aime</Text>
    <Text style={styles.countDot}>•</Text>
    <Text style={styles.countTxt}>{comments} commentaires</Text>
    <Text style={styles.countDot}>•</Text>
    <Text style={styles.countTxt}>{shares} partages</Text>
  </View>
);

/** -------- MOCK DATA & Pagination -------- */
const AVATARS = [
  'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?q=80&w=256',
  'https://images.unsplash.com/photo-1511367461989-f85a21fda167?q=80&w=256',
  'https://images.unsplash.com/photo-1527980965255-d3b416303d12?q=80&w=256',
];
const IMAGES = [
  'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?q=80&w=1600',
  'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=1600',
  'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=1600',
  'https://images.unsplash.com/photo-1491553895911-0055eca6402d?q=80&w=1600',
];

const rand = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

const makeProduct = (i: number): Product => ({
  id: `p-${i}`,
  title:
    ['Casque Bluetooth', 'Montre connectée', 'Caméra Action', 'Enceinte Portable', 'Clavier Mécanique'][i % 5] +
    ` ${100 + i}`,
  price: [59, 95, 129, 199, 279, 349][i % 6],
  image: rand(IMAGES),
  rating: 3.8 + (i % 12) * 0.1,
  category: ['Audio', 'Wearables', 'Photo', 'Accessoires'][i % 4],
});

const makeAuthor = (i: number) => ({
  name: ['TechOne', 'ShopLine', 'Gadgeto'][i % 3],
  avatar: AVATARS[i % AVATARS.length],
});

function makePage(page: number): Post[] {
  const base = page * 14;
  const posts: Post[] = [];
  for (let i = 0; i < 14; i++) {
    const mod = i % 7;
    const author = makeAuthor(base + i);
    const createdAt = new Date(Date.now() - (base + i) * 3600_000).toISOString();
    if (mod === 0) {
      posts.push({
        type: 'product',
        id: `post-prod-${base + i}`,
        author,
        createdAt,
        likes: 20 + (i % 70),
        comments: 2 + (i % 25),
        shares: i % 10,
        product: makeProduct(base + i),
        caption: ['Nouveau en stock ⚡', 'Notre coup de cœur', 'Prix spécial cette semaine'][i % 3],
      });
    } else if (mod === 1) {
      posts.push({
        type: 'article',
        id: `post-art-${base + i}`,
        author,
        createdAt,
        likes: 10 + (i % 40),
        comments: 1 + (i % 20),
        shares: i % 7,
        title: ['Guide d’achat audio 2025', 'Bien choisir sa montre connectée', 'Top accessoires de voyage'][i % 3],
        cover: rand(IMAGES),
        excerpt:
          'Conseils, critères essentiels, et nos recommandations pour tous les budgets. Tendances et bonnes pratiques.',
        link: '#',
      });
    } else if (mod === 2) {
      posts.push({
        type: 'collection',
        id: `post-col-${base + i}`,
        author,
        createdAt,
        likes: 15 + (i % 60),
        comments: 3 + (i % 22),
        shares: i % 9,
        title: ['Indispensables Audio', 'Setup productif', 'Objets futés du quotidien'][i % 3],
        cover: rand(IMAGES),
        products: [makeProduct(base + i), makeProduct(base + i + 1), makeProduct(base + i + 2), makeProduct(base + i + 3)],
      });
    } else if (mod === 3) {
      posts.push({
        type: 'hero',
        id: `post-hero-${base + i}`,
        author,
        createdAt,
        likes: 30 + (i % 80),
        comments: 4 + (i % 30),
        shares: i % 6,
        title: 'Nouvelle collection Tech',
        subtitle: 'Boostez votre quotidien',
        image: rand(IMAGES),
        cta: 'Explorer',
      });
    } else if (mod === 4) {
      posts.push({
        type: 'tip',
        id: `post-tip-${base + i}`,
        author,
        createdAt,
        likes: 8 + (i % 30),
        comments: 1 + (i % 12),
        shares: i % 5,
        title: 'Astuce charge rapide',
        body: 'Utilise un chargeur PD 30W minimum pour optimiser la vitesse sans surchauffer.',
        icon: '⚙️',
      });
    } else if (mod === 5) {
      posts.push({
        type: 'shoplook',
        id: `post-look-${base + i}`,
        author,
        createdAt,
        likes: 25 + (i % 70),
        comments: 2 + (i % 22),
        shares: i % 7,
        title: 'Shop the look — bureau minimal',
        products: [makeProduct(base + i), makeProduct(base + i + 2), makeProduct(base + i + 4)],
      });
    } else {
      posts.push({
        type: 'poll',
        id: `post-poll-${base + i}`,
        author,
        createdAt,
        likes: 12 + (i % 40),
        comments: 3 + (i % 16),
        shares: i % 6,
        question: 'Team casque ou écouteurs pour le sport ?',
        options: [
          { id: 'a', label: 'Casque', votes: 120 + (i % 50) },
          { id: 'b', label: 'Écouteurs', votes: 180 + (i % 60) },
          { id: 'c', label: 'Peu importe', votes: 40 + (i % 20) },
        ],
        totalVotes: 120 + 180 + 40 + (i % 50) + (i % 60) + (i % 20),
      });
    }
  }
  return posts;
}

/** -------- Utils -------- */
const formatPrice = (n: number) =>
  Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

const formatTimeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.max(1, Math.round(diff / 60000));
  if (mins < 60) return `il y a ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  return `il y a ${d} j`;
};

/** -------- Écran principal -------- */
const DiscoverScreen: React.FC = () => {
  const navigation = useNavigation();
  const [posts, setPosts] = useState<Post[]>([]);
  const [page, setPage] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [activeChip, setActiveChip] = useState('Tous');

  // Chargement initial
  useEffect(() => {
    const t = setTimeout(() => {
      const first = makePage(0);
      setPosts(first);
      setInitialLoading(false);
      setPage(1);
    }, 500);
    return () => clearTimeout(t);
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => {
      setPosts(makePage(0));
      setPage(1);
      setRefreshing(false);
    }, 700);
  }, []);

  const loadMore = useCallback(() => {
    if (loadingMore || initialLoading) return;
    setLoadingMore(true);
    setTimeout(() => {
      setPosts((p) => [...p, ...makePage(page)]);
      setPage((pg) => pg + 1);
      setLoadingMore(false);
    }, 800);
  }, [loadingMore, initialLoading, page]);

  // Filtrage simple côté client
  const filtered = useMemo(() => {
    const byChip =
      activeChip === 'Tous'
        ? posts
        : posts.filter((it) => (it.type === 'product' ? (it as ProductPost).product.category === activeChip : true));
    if (!query.trim()) return byChip;
    const q = query.trim().toLowerCase();
    return byChip.filter((it) => {
      if (it.type === 'product') return it.product.title.toLowerCase().includes(q);
      if (it.type === 'article') return it.title.toLowerCase().includes(q) || it.excerpt.toLowerCase().includes(q);
      if (it.type === 'collection') return it.title.toLowerCase().includes(q);
      if (it.type === 'hero') return it.title.toLowerCase().includes(q) || (it.subtitle ?? '').toLowerCase().includes(q);
      if (it.type === 'tip') return it.title.toLowerCase().includes(q) || it.body.toLowerCase().includes(q);
      if (it.type === 'shoplook') return it.title.toLowerCase().includes(q);
      if (it.type === 'poll') return it.question.toLowerCase().includes(q);
      return false;
    });
  }, [posts, activeChip, query]);

  const chips = useMemo(() => ['Tous', 'Audio', 'Wearables', 'Photo', 'Accessoires'], []);

  const renderItem = useCallback(
    ({ item }: { item: Post }) => {
      switch (item.type) {
        case 'product':
          return (
            <ProductPostCard
              post={item}
              onOpen={() => {
                // @ts-ignore — adapte la route si besoin
                navigation.navigate('ProductDetail', { productId: item.product.id });
              }}
            />
          );
        case 'article':
          return <ArticlePostCard post={item} />;
        case 'collection':
          return (
            <CollectionPostCard
              post={item}
              onOpen={(p) => navigation.navigate('ProductDetail' as never, { productId: p.id } as never)}
            />
          );
        case 'hero':
          return <HeroPostCard post={item} />;
        case 'tip':
          return <TipPostCard post={item} />;
        case 'shoplook':
          return (
            <ShopLookPostCard
              post={item}
              onOpen={(p) => navigation.navigate('ProductDetail' as never, { productId: p.id } as never)}
            />
          );
        case 'poll':
          return <PollPostCard post={item} />;
        default:
          return null;
      }
    },
    [navigation],
  );

  const keyExtractor = useCallback((p: Post) => p.id, []);

  const Header = useMemo(
    () => (
      <>
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Découvrir</Text>
        </View>

        {/* Barre de recherche (outlined) */}
        <View style={styles.searchBar}>
          <TextInput
            placeholder="Rechercher dans le fil"
            placeholderTextColor={TOKENS.textMuted}
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          <RippleBtn style={styles.searchAction}>
            <Text style={styles.searchActionText}>Filtres</Text>
          </RippleBtn>
        </View>

        {/* Chips catégories */}
        <FlatList
          horizontal
          data={chips}
          keyExtractor={(c) => c}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: GUTTER - 4, gap: 8 }}
          style={{ marginTop: 8 }}
          renderItem={({ item: chip }) => (
            <RippleBtn
              onPress={() => setActiveChip(chip)}
              style={[styles.chip, activeChip === chip && styles.chipActive]}
            >
              <Text style={[styles.chipText, activeChip === chip && styles.chipTextActive]}>{chip}</Text>
            </RippleBtn>
          )}
        />

        {/* Pas de composer si adminOnlyPost = true */}
        {!adminOnlyPost && (
          <View style={styles.composerWrap}>
            <Avatar uri="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=256" size={36} />
            <TextInput
              placeholder="Quoi de neuf ?"
              placeholderTextColor={TOKENS.textMuted}
              style={styles.composerInput}
              editable={false}
            />
          </View>
        )}
      </>
    ),
    [chips, activeChip, query],
  );

  const Footer = useMemo(
    () => (
      <View style={{ paddingVertical: 24 }}>
        {loadingMore ? (
          <>
            <Skeleton height={18} style={{ marginHorizontal: GUTTER, marginBottom: 10 }} />
            <Skeleton height={220} style={{ marginHorizontal: GUTTER }} />
          </>
        ) : (
          <Text style={styles.footerTxt}>Tu as tout vu pour l’instant 👀</Text>
        )}
      </View>
    ),
    [loadingMore],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle={Platform.OS === 'ios' ? 'dark-content' : 'light-content'} />
      {initialLoading ? (
        <View style={{ paddingTop: 12 }}>
          <Skeleton height={24} style={{ marginHorizontal: GUTTER }} />
          <View style={{ height: 12 }} />
          {[0, 1, 2].map((i) => (
            <View key={i} style={{ marginBottom: 16 }}>
              <Skeleton height={18} style={{ marginHorizontal: GUTTER, marginBottom: 10 }} />
              <Skeleton height={220} style={{ marginHorizontal: GUTTER }} />
            </View>
          ))}
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={TOKENS.accent} />}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          ListHeaderComponent={Header}
          ListFooterComponent={Footer}
          contentContainerStyle={{ paddingBottom: 32 }}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
};

/** -------- Styles (no shadows, outlined/tonal) -------- */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: TOKENS.bg },

  topBar: {
    paddingHorizontal: GUTTER,
    paddingTop: 8,
    paddingBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  screenTitle: { fontSize: 26, fontWeight: '800', color: TOKENS.text, letterSpacing: -0.5 },

  // Search — outlined
  searchBar: {
    marginTop: 8,
    marginHorizontal: GUTTER,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.outline,
  },
  searchInput: { flex: 1, fontSize: 15, color: TOKENS.text, paddingVertical: 6 },
  searchAction: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: TOKENS.surfaceVariant,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.outline,
  },
  searchActionText: { fontSize: 13, color: TOKENS.text, fontWeight: '700' },

  // Chips
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: TOKENS.surfaceVariant,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.outline,
  },
  chipActive: { backgroundColor: TOKENS.accent, borderColor: TOKENS.accent },
  chipText: { fontSize: 13, color: TOKENS.text, fontWeight: '700' },
  chipTextActive: { color: '#FFFFFF' },

  // Composer (non utilisé si adminOnlyPost = true)
  composerWrap: {
    marginHorizontal: GUTTER,
    marginTop: 8,
    marginBottom: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  composerInput: {
    flex: 1,
    backgroundColor: TOKENS.surfaceVariant,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    color: TOKENS.text,
    fontSize: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.outline,
  },

  // Post container — outlined (no elevation)
  post: {
    marginHorizontal: GUTTER,
    marginTop: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.outline,
  },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  author: { fontSize: 15, fontWeight: '700', color: TOKENS.text },
  meta: { fontSize: 12, color: TOKENS.textSubtle },
  more: { fontSize: 20, color: TOKENS.textMuted, paddingHorizontal: 6 },

  caption: { fontSize: 15, color: TOKENS.text, marginBottom: 10 },

  // Product card — outlined
  productCard: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.outline,
  },
  productImage: { width: '100%', height: Math.min(300, width * 0.6), backgroundColor: TOKENS.surfaceVariant },
  productBody: { padding: 10, gap: 4 },
  productTitle: { fontSize: 15, fontWeight: '700', color: TOKENS.text },
  productPrice: { fontSize: 14, fontWeight: '700', color: '#475569' },

  // Article
  articleTitle: { fontSize: 17, fontWeight: '800', color: TOKENS.text, marginBottom: 8 },
  articleCover: {
    width: '100%',
    height: Math.min(260, width * 0.52),
    borderRadius: 14,
    marginBottom: 10,
    backgroundColor: TOKENS.surfaceVariant,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.outline,
  },
  articleExcerpt: { fontSize: 14, color: '#374151' },

  // Collection
  collectionTitle: { fontSize: 16, fontWeight: '800', color: TOKENS.text, marginBottom: 10 },
  collectionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  collectionItem: {
    width: (width - GUTTER * 2 - 10 * 3) / 2,
    height: (width - GUTTER * 2 - 10 * 3) / 2,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: TOKENS.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.outline,
  },
  collectionImg: { width: '100%', height: '100%', backgroundColor: TOKENS.surfaceVariant },

  // Hero promo (overlay de lisibilité, sans ombre)
  hero: { height: Math.min(280, width * 0.55), borderRadius: 18, overflow: 'hidden' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: TOKENS.overlay },
  heroContent: { position: 'absolute', left: 14, right: 14, bottom: 14, gap: 6 },
  heroTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '800', letterSpacing: -0.3 },
  heroSubtitle: { color: '#F3F4F6', fontSize: 13 },
  heroCta: {
    alignSelf: 'flex-start',
    backgroundColor: TOKENS.accent,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  heroCtaText: { color: '#FFFFFF', fontWeight: '800', fontSize: 13 },

  // Tip
  tipWrap: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
    backgroundColor: TOKENS.surfaceVariant,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.outline,
  },
  tipIcon: { fontSize: 20 },
  tipTitle: { fontSize: 15, fontWeight: '800', color: TOKENS.text },
  tipBody: { fontSize: 14, color: '#374151', marginTop: 2 },

  // Shop the look
  lookCard: {
    width: 150,
    backgroundColor: TOKENS.surface,
    borderRadius: 14,
    padding: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.outline,
  },
  lookImg: { width: '100%', height: 110, borderRadius: 10, backgroundColor: TOKENS.surfaceVariant, marginBottom: 8 },
  lookTitle: { fontSize: 13, fontWeight: '700', color: TOKENS.text },
  lookPrice: { fontSize: 12, fontWeight: '700', color: '#475569' },

  // Poll (readonly)
  pollRow: { gap: 6 },
  pollBarBg: {
    height: 10,
    backgroundColor: TOKENS.surfaceVariant,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: TOKENS.outline,
  },
  pollBarFill: { height: 10, backgroundColor: TOKENS.accent },
  pollLabel: { fontSize: 13, color: TOKENS.text, marginTop: 2 },
  pollMeta: { fontSize: 12, color: TOKENS.textSubtle, marginTop: 6 },

  // Counts & toolbar
  counts: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10, marginBottom: 6 },
  countTxt: { color: TOKENS.textSubtle, fontSize: 12, fontWeight: '700' },
  countDot: { color: TOKENS.textMuted },
  toolbar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: TOKENS.outline,
    marginTop: 8,
  },
  toolbarBtn: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  toolbarTxt: { fontSize: 14, fontWeight: '800', color: TOKENS.text },

  // Footer
  footerTxt: { textAlign: 'center', color: TOKENS.textMuted, fontSize: 13, marginTop: 8 },
});

export default DiscoverScreen;
