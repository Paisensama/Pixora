import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  UIManager,
  Dimensions,
  FlatList,
  Image,
  Linking,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import GameCard from './components/GameCard';
import FilterButton from './components/FilterButton';
import { RAWG_API_KEY, RAWG_BASE_URL } from './constants/api';

const FILTERS = [
  { label: 'All Time', value: 'all' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'This Year', value: 'year' },
];

const PLATFORM_FILTERS = [
  { label: 'All Platforms', value: 'all' },
  { label: 'PC Only', value: 'pc' },
  { label: 'Android Only', value: 'android' },
  { label: 'PC + Android', value: 'both' },
];

const LANGUAGE_FILTERS = [
  { label: 'Any Language', value: 'all' },
  { label: 'English', value: 'en' },
  { label: 'Japanese', value: 'ja' },
  { label: 'Korean', value: 'ko' },
  { label: 'Chinese', value: 'zh' },
  { label: 'Spanish', value: 'es' },
  { label: 'French', value: 'fr' },
  { label: 'German', value: 'de' },
  { label: 'Portuguese', value: 'pt' },
  { label: 'Italian', value: 'it' },
  { label: 'Russian', value: 'ru' },
];

const NSFW_TAGS = [
  'nsfw',
  'sexual',
  'sex',
  'hentai',
  'porn',
  'pornographic',
  'adult',
  'eroge',
  'ecchi',
];

const PIXEL_ICONS = [
  {
    color: '#31e57a',
    grid: [
      '00111100',
      '01111110',
      '11011011',
      '11111111',
      '11111111',
      '10111101',
      '00100100',
      '01000010',
    ],
  },
  {
    color: '#ff3bd4',
    grid: [
      '00111100',
      '01111110',
      '11111111',
      '11011011',
      '11111111',
      '01100110',
      '11000011',
      '00100100',
    ],
  },
  {
    color: '#ffe149',
    grid: [
      '00111100',
      '01111110',
      '11111111',
      '11011011',
      '11111111',
      '01011010',
      '00100100',
      '01000010',
    ],
  },
];

const SCREENSHOT_WIDTH = Dimensions.get('window').width - 64;

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDateRange = (filter) => {
  const today = new Date();
  const end = formatDate(today);

  if (filter === 'all') {
    return null;
  }

  if (filter === 'week') {
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 6);
    return { start: formatDate(startDate), end };
  }

  if (filter === 'year') {
    const startDate = new Date(today.getFullYear(), 0, 1);
    return { start: formatDate(startDate), end };
  }

  const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
  return { start: formatDate(startDate), end };
};

export default function App() {
  const [showMain, setShowMain] = useState(false);
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [sortOption, setSortOption] = useState('rating');
  const [sortDirection, setSortDirection] = useState('desc');
  const [sortMenuVisible, setSortMenuVisible] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('all');
  const [showNsfw, setShowNsfw] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [genrePanelVisible, setGenrePanelVisible] = useState(false);
  const [languageFilter, setLanguageFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [dailyGames, setDailyGames] = useState([]);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [topGames, setTopGames] = useState([]);
  const [topLoading, setTopLoading] = useState(false);
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(false);
  const [genreError, setGenreError] = useState('');
  const [genreInclude, setGenreInclude] = useState([]);
  const [genreExclude, setGenreExclude] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [trailerLoading, setTrailerLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [gameDetails, setGameDetails] = useState(null);
  const [actionsCollapsed, setActionsCollapsed] = useState(true);
  const [screenshots, setScreenshots] = useState([]);
  const [screenshotsLoading, setScreenshotsLoading] = useState(false);
  const [activeShotIndex, setActiveShotIndex] = useState(0);
  const [favorites, setFavorites] = useState([]);
  const favoritesKey = 'favorites';
  const [recentlyDeleted, setRecentlyDeleted] = useState([]);
  const [undoTarget, setUndoTarget] = useState(null);
  const [activeTab, setActiveTab] = useState('home');
  const [compactHeader, setCompactHeader] = useState(false);
  const [layoutMode, setLayoutMode] = useState('grid');
  const headerAnim = React.useRef(new Animated.Value(1)).current;
  const listRef = React.useRef(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const scrollTopAnim = React.useRef(new Animated.Value(0)).current;

  // Build the main RAWG query based on UI state.
  const buildUrl = (pageNumber = 1) => {
    const range = getDateRange(selectedFilter);
    const orderingMap = {
      relevance: 'relevance',
      added: 'added',
      name: 'name',
      release_date: 'released',
      popularity: 'added',
      rating: 'rating',
    };
    const params = [
      `key=${RAWG_API_KEY}`,
      `ordering=${(sortDirection === 'desc' ? '-' : '') +
        (orderingMap[sortOption] || 'rating')}`,
      'page_size=40',
      `page=${pageNumber}`,
    ];

    if (range) {
      params.push(`dates=${range.start},${range.end}`);
    }

    if (searchQuery.trim()) {
      params.push(`search=${encodeURIComponent(searchQuery.trim())}`);
    }

    if (genreInclude.length === 1) {
      params.push(`genres=${genreInclude[0]}`);
    }
    if (languageFilter !== 'all') {
      params.push(`languages=${languageFilter}`);
    }

    return `${RAWG_BASE_URL}?${params.join('&')}`;
  };

  // Lightweight search suggestions as the user types.
  const fetchSuggestions = async (query) => {
    if (!query.trim()) {
      setSuggestions([]);
      return;
    }
    setSuggestionsLoading(true);
    try {
      const params = [
        `key=${RAWG_API_KEY}`,
        `search=${encodeURIComponent(query.trim())}`,
        'page_size=6',
      ];
      const url = `${RAWG_BASE_URL}?${params.join('&')}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch suggestions.');
      }
      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      setSuggestions(results);
    } catch (err) {
      setSuggestions([]);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Daily highlights (today only).
  const buildDailyUrl = () => {
    const today = formatDate(new Date());
    const params = [
      `key=${RAWG_API_KEY}`,
      `dates=${today},${today}`,
      'ordering=-rating',
      'page_size=10',
    ];

    return `${RAWG_BASE_URL}?${params.join('&')}`;
  };

  // Top charts by most added.
  const buildTopUrl = () => {
    const params = [
      `key=${RAWG_API_KEY}`,
      'ordering=-added',
      'page_size=10',
    ];

    return `${RAWG_BASE_URL}?${params.join('&')}`;
  };

  // Genres list for filters.
  const buildGenresUrl = () => {
    return 'https://api.rawg.io/api/genres?key=' +
      RAWG_API_KEY +
      '&page_size=12';
  };

  // Main games list with pagination.
  const fetchGames = async (options = {}) => {
    const {
      withLoading = true,
      pageNumber = 1,
      replace = pageNumber === 1,
    } = options;

    if (withLoading) {
      setLoading(true);
    }
    setError('');

    try {
      const response = await fetch(buildUrl(pageNumber));
      if (!response.ok) {
        throw new Error('Failed to fetch games. Check your API key.');
      }
      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      setGames((prev) => (replace ? results : [...prev, ...results]));
      setHasMore(Boolean(data.next));
    } catch (err) {
      setError(err.message || 'Something went wrong.');
      if (pageNumber === 1) {
        setGames([]);
      }
    } finally {
      if (withLoading) {
        setLoading(false);
      }
    }
  };

  // Fetch daily picks.
  const fetchDailyGames = async () => {
    setDailyLoading(true);

    try {
      const response = await fetch(buildDailyUrl());
      if (!response.ok) {
        throw new Error('Failed to fetch daily games.');
      }
      const data = await response.json();
      setDailyGames(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      setDailyGames([]);
    } finally {
      setDailyLoading(false);
    }
  };

  // Fetch top charts.
  const fetchTopGames = async () => {
    setTopLoading(true);

    try {
      const response = await fetch(buildTopUrl());
      if (!response.ok) {
        throw new Error('Failed to fetch top charts.');
      }
      const data = await response.json();
      setTopGames(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      setTopGames([]);
    } finally {
      setTopLoading(false);
    }
  };

  // Screenshot carousel for details modal.
  const fetchScreenshots = async (gameId) => {
    if (!gameId) {
      return;
    }
    setScreenshotsLoading(true);
    try {
      const url = `https://api.rawg.io/api/games/${gameId}/screenshots?key=${RAWG_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch screenshots.');
      }
      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      setScreenshots(results);
      setActiveShotIndex(0);
    } catch (err) {
      setScreenshots([]);
    } finally {
      setScreenshotsLoading(false);
    }
  };

  // Full details for description/website.
  const fetchGameDetails = async (gameId) => {
    if (!gameId) {
      return;
    }
    setDetailsLoading(true);
    try {
      const url = `https://api.rawg.io/api/games/${gameId}?key=${RAWG_API_KEY}`;
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch game details.');
      }
      const data = await response.json();
      setGameDetails(data);
    } catch (err) {
      setGameDetails(null);
    } finally {
      setDetailsLoading(false);
    }
  };

  // Safe external link opener.
  const openExternalUrl = async (url) => {
    if (!url) {
      return false;
    }
    const canOpen = await Linking.canOpenURL(url);
    if (!canOpen) {
      return false;
    }
    await Linking.openURL(url);
    return true;
  };

  // Try RAWG movies, then RAWG YouTube fallback.
  const openTrailer = async (game) => {
    if (!game?.id || trailerLoading) {
      return;
    }
    setTrailerLoading(true);
    const moviesUrl = `https://api.rawg.io/api/games/${game.id}/movies?key=${RAWG_API_KEY}`;
    const youtubeUrl = `https://api.rawg.io/api/games/${game.id}/youtube?key=${RAWG_API_KEY}`;
    let opened = false;

    try {
      const response = await fetch(moviesUrl);
      if (response.ok) {
        const data = await response.json();
        const first = Array.isArray(data.results) ? data.results[0] : null;
        const trailer =
          first?.data?.max ||
          first?.data?.['480'] ||
          first?.data?.['720'] ||
          first?.data?.['360'];
        if (trailer) {
          opened = await openExternalUrl(trailer);
        }
      }
    } catch (err) {
      // fallback below
    }
    if (opened) {
      setTrailerLoading(false);
      return;
    }

    try {
      const response = await fetch(youtubeUrl);
      if (response.ok) {
        const data = await response.json();
        const first = Array.isArray(data.results) ? data.results[0] : null;
        const url = first?.external_id
          ? `https://www.youtube.com/watch?v=${first.external_id}`
          : first?.url;
        if (url) {
          opened = await openExternalUrl(url);
        }
      }
    } catch (err) {
      // ignore
    }
    setTrailerLoading(false);
    if (!opened) {
      Alert.alert('Trailer unavailable', 'No trailer found for this game.');
    }
  };

  // Load genres with offline cache fallback.
  const fetchGenres = async () => {
    setGenresLoading(true);
    try {
      setGenreError('');
      const response = await fetch(buildGenresUrl());
      if (!response.ok) {
        throw new Error('Failed to fetch genres.');
      }
      const data = await response.json();
      const results = Array.isArray(data.results) ? data.results : [];
      setGenres(results);
      try {
        await AsyncStorage.setItem('genres_cache', JSON.stringify(results));
      } catch (err) {
        // ignore cache write errors
      }
    } catch (err) {
      let cached = null;
      try {
        const stored = await AsyncStorage.getItem('genres_cache');
        cached = stored ? JSON.parse(stored) : null;
      } catch (cacheErr) {
        cached = null;
      }
      if (Array.isArray(cached) && cached.length) {
        setGenres(cached);
        setGenreError('');
      } else {
        setGenreError(err.message || 'Failed to fetch genres.');
        setGenres([]);
      }
    } finally {
      setGenresLoading(false);
    }
  };

  // Add/remove a favorite.
  const toggleFavorite = (game) => {
    setFavorites((prev) => {
      const exists = prev.some((item) => item.id === game.id);
      if (exists) {
        return prev.filter((item) => item.id !== game.id);
      }
      return [game, ...prev];
    });
  };

  // Remove and push into recently deleted.
  const removeFavorite = (game) => {
    setFavorites((prev) => prev.filter((item) => item.id !== game.id));
    setRecentlyDeleted((prev) => {
      const next = [{ ...game }, ...prev];
      return next.slice(0, 5);
    });
    setUndoTarget(game);
  };

  // Restore last deleted favorite.
  const undoRemove = () => {
    if (!undoTarget) {
      return;
    }
    setFavorites((prev) => {
      if (prev.some((item) => item.id === undoTarget.id)) {
        return prev;
      }
      return [undoTarget, ...prev];
    });
    setRecentlyDeleted((prev) =>
      prev.filter((item) => item.id !== undoTarget.id)
    );
    setUndoTarget(null);
  };

  // Restore from the recently deleted row.
  const restoreRecentlyDeleted = (game) => {
    setFavorites((prev) => {
      if (prev.some((item) => item.id === game.id)) {
        return prev;
      }
      return [game, ...prev];
    });
    setRecentlyDeleted((prev) => prev.filter((item) => item.id !== game.id));
    setUndoTarget(null);
  };

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchGames({ pageNumber: 1, replace: true });
  }, [selectedFilter, sortOption, genreInclude, genreExclude]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchGames({ pageNumber: 1, replace: true });
  }, [sortDirection]);

  useEffect(() => {
    fetchDailyGames();
  }, []);

  useEffect(() => {
    fetchTopGames();
    fetchGenres();
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    let mounted = true;
    const loadFavorites = async () => {
      try {
        const stored = await AsyncStorage.getItem('favorites');
        if (mounted) {
          setFavorites(stored ? JSON.parse(stored) : []);
        }
      } catch (err) {
        if (mounted) {
          setFavorites([]);
        }
      }
    };
    loadFavorites();
    return () => {
      mounted = false;
    };
  }, [favoritesKey]);

  useEffect(() => {
    const persistFavorites = async () => {
      try {
        await AsyncStorage.setItem('favorites', JSON.stringify(favorites));
      } catch (err) {
        // keep in-memory favorites if storage fails
      }
    };
    persistFavorites();
  }, [favorites]);

  useEffect(() => {
    if (genres.length || !games.length) {
      return;
    }
    const unique = new Map();
    games.forEach((game) => {
      if (!Array.isArray(game.genres)) {
        return;
      }
      game.genres.forEach((genre) => {
        if (genre?.id && !unique.has(genre.id)) {
          unique.set(genre.id, genre);
        }
      });
    });
    if (unique.size) {
      setGenres(Array.from(unique.values()));
    }
  }, [games, genres.length]);

  useEffect(() => {
    if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [layoutMode]);

  useEffect(() => {
    Animated.timing(scrollTopAnim, {
      toValue: showScrollTop ? 1 : 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [showScrollTop, scrollTopAnim]);

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: compactHeader ? 0 : 1,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [compactHeader, headerAnim]);

  useEffect(() => {
    if (detailsVisible && selectedGame?.id) {
      fetchScreenshots(selectedGame.id);
      fetchGameDetails(selectedGame.id);
      setActionsCollapsed(true);
    } else {
      setScreenshots([]);
      setGameDetails(null);
    }
  }, [detailsVisible, selectedGame?.id]);

  // Pull-to-refresh for all sections.
  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await Promise.all([
      fetchGames({ withLoading: false, pageNumber: 1, replace: true }),
      fetchDailyGames(),
      fetchTopGames(),
    ]);
    setRefreshing(false);
  };

  // Explicit search submit.
  const startSearch = () => {
    setPage(1);
    setHasMore(true);
    setSuggestions([]);
    fetchGames({ pageNumber: 1, replace: true });
  };

  // Infinite scroll pagination.
  const loadMore = () => {
    if (loading || refreshing || !hasMore) {
      return;
    }
    const nextPage = page + 1;
    setPage(nextPage);
    fetchGames({ withLoading: false, pageNumber: nextPage, replace: false });
  };

  const renderListHeader = () => (
    <>
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Charts</Text>
          <Text style={styles.sectionTag}>Most added</Text>
        </View>
        {topLoading ? (
          <View style={styles.dailyLoading}>
            <ActivityIndicator size="small" color="#31e57a" />
            <Text style={styles.helperText}>Loading top charts...</Text>
          </View>
        ) : topGames.length ? (
          <FlatList
            data={topGames}
            keyExtractor={(item) => `top-${item.id}`}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dailyList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dailyCard}
                activeOpacity={0.85}
                onPress={() => {
                  setSelectedGame(item);
                  setDetailsVisible(true);
                }}
              >
                {item.background_image ? (
                  <Image
                    source={{ uri: item.background_image }}
                    style={styles.dailyImage}
                  />
                ) : (
                  <View style={[styles.dailyImage, styles.imageFallback]}>
                    <Text style={styles.imageFallbackText}>No Image</Text>
                  </View>
                )}
                <View style={styles.dailyInfo}>
                  <Text style={styles.dailyTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.dailyMeta}>
                    Rating: {item.rating || 'N/A'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          />
        ) : (
          <Text style={styles.helperText}>No top charts found.</Text>
        )}
      </View>

      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Daily Popular</Text>
          <Text style={styles.sectionTag}>Updated today</Text>
        </View>
        {dailyLoading ? (
          <View style={styles.dailyLoading}>
            <ActivityIndicator size="small" color="#31e57a" />
            <Text style={styles.helperText}>Loading daily picks...</Text>
          </View>
        ) : dailyGames.length ? (
          <FlatList
            data={dailyGames}
            keyExtractor={(item) => `daily-${item.id}`}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dailyList}
            renderItem={({ item }) => (
              <View style={styles.dailyCard}>
                {item.background_image ? (
                  <Image
                    source={{ uri: item.background_image }}
                    style={styles.dailyImage}
                  />
                ) : (
                  <View style={[styles.dailyImage, styles.imageFallback]}>
                    <Text style={styles.imageFallbackText}>No Image</Text>
                  </View>
                )}
                <View style={styles.dailyInfo}>
                  <Text style={styles.dailyTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.dailyMeta}>
                    Rating: {item.rating || 'N/A'}
                  </Text>
                </View>
              </View>
            )}
          />
        ) : (
          <Text style={styles.helperText}>No daily games found.</Text>
        )}
      </View>

    </>
  );

  const renderHeader = () => (
    <View>
      {renderListHeader()}
    </View>
  );

  const renderContent = () => {
    const isNsfwGame = (game) => {
      const esrb = game?.esrb_rating?.name?.toLowerCase() || '';
      if (esrb === 'adults only' || esrb === 'adult') {
        return true;
      }
      const tags = Array.isArray(game?.tags) ? game.tags : [];
      return tags.some((tag) => {
        const slug = String(tag?.slug || '').toLowerCase();
        const name = String(tag?.name || '').toLowerCase();
        return NSFW_TAGS.some(
          (needle) => slug.includes(needle) || name.includes(needle)
        );
      });
    };

    const filteredGames = games.filter((game) => {
      const gameGenres = Array.isArray(game.genres)
        ? game.genres.map((g) => g.slug)
        : [];
      const gamePlatforms = Array.isArray(game.platforms)
        ? game.platforms
            .map((p) => p?.platform?.slug)
            .filter(Boolean)
        : [];
      const passesInclude = genreInclude.length
        ? genreInclude.some((id) => gameGenres.includes(id))
        : true;
      const passesExclude = genreExclude.length
        ? !genreExclude.some((id) => gameGenres.includes(id))
        : true;
      const hasPC = gamePlatforms.includes('pc');
      const hasAndroid = gamePlatforms.includes('android');
      const passesPlatform =
        platformFilter === 'all'
          ? true
          : platformFilter === 'pc'
          ? hasPC && !hasAndroid
          : platformFilter === 'android'
          ? hasAndroid && !hasPC
          : hasPC && hasAndroid;
      const passesNsfw = showNsfw ? true : !isNsfwGame(game);
      return passesInclude && passesExclude && passesPlatform && passesNsfw;
    });

    const emptyMessage = loading
      ? 'Loading games...'
      : error
      ? error
      : genreExclude.length && !genreInclude.length
      ? 'No games found because all selected genres are excluded.'
      : genreInclude.length || genreExclude.length
      ? 'No games found for the selected genres.'
      : platformFilter !== 'all'
      ? 'No games found for the selected platform filter.'
      : 'No games found for this filter.';

    return (
      <View style={styles.listWrapper}>
        <FlatList
          ref={listRef}
          data={filteredGames}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={renderHeader}
          key={`list-${layoutMode}`}
          onScroll={(event) => {
            const y = event.nativeEvent.contentOffset.y || 0;
            if (y > 80 && !compactHeader) {
              setCompactHeader(true);
            } else if (y <= 80 && compactHeader) {
              setCompactHeader(false);
            }
            if (y > 400 && !showScrollTop) {
              setShowScrollTop(true);
            } else if (y <= 400 && showScrollTop) {
              setShowScrollTop(false);
            }
          }}
          scrollEventThrottle={16}
          renderItem={({ item }) => {
            return (
              <GameCard
                game={item}
                description={
                  item.description_raw ||
                  item.description ||
                  (Array.isArray(item.tags) && item.tags.length
                    ? `Tags: ${item.tags
                        .slice(0, 3)
                        .map((tag) => tag.name)
                        .join(', ')}`
                    : Array.isArray(item.genres) && item.genres.length
                    ? `Genres: ${item.genres
                        .slice(0, 3)
                        .map((genre) => genre.name)
                        .join(', ')}`
                    : '')
                }
                isFavorite={favorites.some((fav) => fav.id === item.id)}
                onToggleFavorite={() => toggleFavorite(item)}
                compact={layoutMode !== 'list'}
                onPress={() => {
                  setSelectedGame(item);
                  setDetailsVisible(true);
                }}
              />
            );
          }}
          numColumns={layoutMode === 'grid' ? 2 : 1}
          columnWrapperStyle={layoutMode === 'grid' ? styles.gridRow : null}
          ListFooterComponent={
            filteredGames.length === 0 ? (
              <View style={styles.center}>
                {loading ? (
                  <ActivityIndicator size="large" color="#31e57a" />
                ) : null}
                <Text style={error ? styles.errorText : styles.helperText}>
                  {emptyMessage}
                </Text>
              </View>
            ) : hasMore ? (
              <View style={styles.center}>
                <ActivityIndicator size="small" color="#31e57a" />
                <Text style={styles.helperText}>Loading more games...</Text>
              </View>
            ) : null
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#31e57a"
            />
          }
        />
        <Animated.View
          pointerEvents={showScrollTop ? 'auto' : 'none'}
          style={[
            styles.scrollTopWrap,
            {
              opacity: scrollTopAnim,
              transform: [
                {
                  scale: scrollTopAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.9, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <TouchableOpacity
            style={styles.scrollTopButton}
            onPress={() =>
              listRef.current?.scrollToOffset({ offset: 0, animated: true })
            }
          >
            <Text style={styles.scrollTopButtonText}>Top</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  const renderFavoritesScreen = () => (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.favoritesScroll}
    >
      {favorites.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Favorites</Text>
            <Text style={styles.sectionTag}>{favorites.length} saved</Text>
          </View>
          {favorites.map((item) => (
            <View key={`fav-screen-${item.id}`} style={styles.favoriteListCard}>
              <TouchableOpacity
                style={styles.favoriteListRow}
                onPress={() => {
                  setSelectedGame(item);
                  setDetailsVisible(true);
                }}
              >
                {item.background_image ? (
                  <Image
                    source={{ uri: item.background_image }}
                    style={styles.favoriteThumb}
                  />
                ) : (
                  <View style={[styles.favoriteThumb, styles.imageFallback]}>
                    <Text style={styles.imageFallbackText}>No Image</Text>
                  </View>
                )}
                <View style={styles.favoriteListInfo}>
                  <Text style={styles.dailyTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.dailyMeta}>
                    Rating: {item.rating || 'N/A'}
                  </Text>
                  {item.description_raw || item.description ? (
                    <Text style={styles.dailyDescription} numberOfLines={2}>
                      {item.description_raw || item.description}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.favoriteDelete}
                onPress={() => removeFavorite(item)}
              >
                <Text style={styles.favoriteDeleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.helperText}>No favorites yet.</Text>
        </View>
      )}

      {undoTarget ? (
        <View style={styles.undoBar}>
          <Text style={styles.undoText}>
            Removed {undoTarget.name}
          </Text>
          <TouchableOpacity style={styles.undoButton} onPress={undoRemove}>
            <Text style={styles.undoButtonText}>Undo</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {recentlyDeleted.length ? (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recently Deleted</Text>
            <Text style={styles.sectionTag}>{recentlyDeleted.length}</Text>
          </View>
          <FlatList
            data={recentlyDeleted}
            keyExtractor={(item) => `del-${item.id}`}
            horizontal
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dailyList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.dailyCard}
                activeOpacity={0.85}
                onPress={() => restoreRecentlyDeleted(item)}
              >
                {item.background_image ? (
                  <Image
                    source={{ uri: item.background_image }}
                    style={styles.dailyImage}
                  />
                ) : (
                  <View style={[styles.dailyImage, styles.imageFallback]}>
                    <Text style={styles.imageFallbackText}>No Image</Text>
                  </View>
                )}
                <View style={styles.dailyInfo}>
                  <Text style={styles.dailyTitle} numberOfLines={2}>
                    {item.name}
                  </Text>
                  <Text style={styles.dailyMeta}>Tap to restore</Text>
                </View>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : null}
    </ScrollView>
  );

  const renderSidebarItem = ({ itemKey, label, active, onPress }) => (
    <TouchableOpacity
      key={itemKey}
      style={[styles.sidebarItem, active && styles.sidebarItemActive]}
      onPress={onPress}
    >
      <Text style={[styles.sidebarItemText, active && styles.sidebarItemTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const getGenreSummary = () => {
    if (!genres.length || (!genreInclude.length && !genreExclude.length)) {
      return 'All';
    }
    const byIdOrSlug = new Map();
    genres.forEach((genre) => {
      if (genre?.slug) {
        byIdOrSlug.set(genre.slug, genre.name);
      }
      if (genre?.id) {
        byIdOrSlug.set(genre.id, genre.name);
      }
    });
    const included = genreInclude.map((id) => byIdOrSlug.get(id)).filter(Boolean);
    const excluded = genreExclude.map((id) => byIdOrSlug.get(id)).filter(Boolean);
    const parts = [];
    if (included.length) {
      parts.push(`Include: ${included.join(', ')}`);
    }
    if (excluded.length) {
      parts.push(`Exclude: ${excluded.join(', ')}`);
    }
    return parts.length ? parts.join(' • ') : 'All';
  };

  if (!showMain) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" />
        <View style={styles.backgroundGlowTop} />
        <View style={styles.backgroundGlowBottom} />
        <View style={styles.backgroundGlowAccent} />
        <View style={styles.homeContainer}>
          <Text style={styles.splashTitle}>
            <Text style={styles.tagCyan}>Pix</Text>
            <Text style={styles.tagMagenta}>ora</Text>
          </Text>
          <View style={styles.pixelRow}>
            {PIXEL_ICONS.map((icon, index) => (
              <View key={`pixel-${index}`} style={styles.pixelIcon}>
                {icon.grid.map((row, rowIndex) => (
                  <View key={`row-${index}-${rowIndex}`} style={styles.pixelRowLine}>
                    {row.split('').map((cell, cellIndex) => (
                      <View
                        key={`cell-${index}-${rowIndex}-${cellIndex}`}
                        style={[
                          styles.pixelCell,
                          cell === '1' && { backgroundColor: icon.color },
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
          <Text style={styles.splashTagline}>
            <Text style={styles.tagCyan}>Explore</Text>
            <Text style={styles.tagSpace}> </Text>
            <Text style={styles.tagMagenta}>Boundless</Text>
            <Text style={styles.tagSpace}> </Text>
            <Text style={styles.tagYellow}>Experiences</Text>
          </Text>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => setShowMain(true)}
          >
            <Text style={styles.primaryButtonText}>CLICK HERE</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.backgroundGlowTop} />
      <View style={styles.backgroundGlowBottom} />
      <View style={styles.backgroundGlowAccent} />

      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <Text style={styles.title}>Pixora</Text>
          <View style={styles.headerIconRow}>
            {PIXEL_ICONS.map((icon, index) => (
              <View key={`mini-${index}`} style={styles.headerIcon}>
                {icon.grid.map((row, rowIndex) => (
                  <View key={`mini-row-${index}-${rowIndex}`} style={styles.headerPixelRow}>
                    {row.split('').map((cell, cellIndex) => (
                      <View
                        key={`mini-cell-${index}-${rowIndex}-${cellIndex}`}
                        style={[
                          styles.headerPixelCell,
                          cell === '1' && { backgroundColor: icon.color },
                        ]}
                      />
                    ))}
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
        <Text style={styles.subtitle}>Explore and Save more</Text>
      </View>

      {activeTab === 'home' ? (
        <>
          <View style={styles.headerBlock}>
            <View style={styles.searchRow}>
            <TextInput
              placeholder="Search by game title"
              placeholderTextColor="#8c8c8c"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={startSearch}
            />
            <TouchableOpacity style={styles.searchButton} onPress={startSearch}>
              <Text style={styles.searchButtonText}>Search</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterToggle}
              onPress={() => setFiltersVisible(true)}
            >
              <Text style={styles.filterToggleText}>Filters</Text>
            </TouchableOpacity>
          </View>
          {searchQuery.trim().length ? (
            <View style={styles.suggestionsBox}>
              {suggestionsLoading ? (
                <Text style={styles.suggestionHint}>Searching...</Text>
              ) : suggestions.length ? (
                suggestions.map((item) => (
                  <TouchableOpacity
                    key={`suggest-${item.id}`}
                    style={styles.suggestionItem}
                    onPress={() => {
                      setSearchQuery(item.name);
                      setSuggestions([]);
                      startSearch();
                    }}
                  >
                    {item.background_image ? (
                      <Image
                        source={{ uri: item.background_image }}
                        style={styles.suggestionImage}
                      />
                    ) : (
                      <View style={[styles.suggestionImage, styles.imageFallback]}>
                        <Text style={styles.imageFallbackText}>No Image</Text>
                      </View>
                    )}
                    <View style={styles.suggestionTextWrap}>
                      <Text style={styles.suggestionText}>{item.name}</Text>
                      {item.released ? (
                        <Text style={styles.suggestionMeta}>
                          {item.released}
                        </Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.suggestionHint}>No matches</Text>
              )}
            </View>
          ) : null}

          {!compactHeader ? (
            <>
              <View style={styles.layoutRow}>
                <TouchableOpacity
                  style={[
                    styles.layoutButton,
                    layoutMode === 'list' && styles.layoutButtonActive,
                  ]}
                  onPress={() => setLayoutMode('list')}
                >
                  <Text
                    style={[
                      styles.layoutButtonText,
                      layoutMode === 'list' && styles.layoutButtonTextActive,
                    ]}
                  >
                    List
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.layoutButton,
                    layoutMode === 'compact' && styles.layoutButtonActive,
                  ]}
                  onPress={() => setLayoutMode('compact')}
                >
                  <Text
                    style={[
                      styles.layoutButtonText,
                      layoutMode === 'compact' && styles.layoutButtonTextActive,
                    ]}
                  >
                    Compact
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.layoutButton,
                    layoutMode === 'grid' && styles.layoutButtonActive,
                  ]}
                  onPress={() => setLayoutMode('grid')}
                >
                  <Text
                    style={[
                      styles.layoutButtonText,
                      layoutMode === 'grid' && styles.layoutButtonTextActive,
                    ]}
                  >
                    Grid
                  </Text>
                </TouchableOpacity>
              </View>

              <Animated.View
                style={[
                  styles.headerAnimated,
                  {
                    opacity: headerAnim,
                    transform: [
                      {
                        translateY: headerAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-12, 0],
                        }),
                      },
                    ],
                  },
                ]}
                pointerEvents={compactHeader ? 'none' : 'auto'}
              >
                <View style={styles.filterRow}>
                  {FILTERS.map((filter) => (
                    <FilterButton
                      key={filter.value}
                      label={filter.label}
                      isActive={selectedFilter === filter.value}
                      onPress={() => setSelectedFilter(filter.value)}
                    />
                  ))}
                </View>

                <View style={styles.sortRow}>
                  <Text style={styles.sortLabel}>Order by</Text>
                  <TouchableOpacity
                    style={styles.sortPicker}
                    onPress={() => setSortMenuVisible(true)}
                  >
                    <Text style={styles.sortPickerText}>
                      {sortOption === 'relevance' && 'Relevance'}
                      {sortOption === 'added' && 'Date added'}
                      {sortOption === 'name' && 'Name'}
                      {sortOption === 'release_date' && 'Release date'}
                      {sortOption === 'popularity' && 'Popularity'}
                      {sortOption === 'rating' && 'Average rating'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.sortDirection}
                    onPress={() =>
                      setSortDirection((prev) => (prev === 'desc' ? 'asc' : 'desc'))
                    }
                  >
                    <Text style={styles.sortDirectionText}>
                      {sortDirection === 'desc' ? 'Descending' : 'Ascending'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            </>
          ) : null}

          </View>

          {renderContent()}
        </>
      ) : (
        renderFavoritesScreen()
      )}

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'home' && styles.tabItemActive]}
          onPress={() => setActiveTab('home')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'home' && styles.tabTextActive,
            ]}
          >
            Home
          </Text>
          {activeTab === 'home' ? <View style={styles.tabDot} /> : null}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === 'favorites' && styles.tabItemActive,
          ]}
          onPress={() => setActiveTab('favorites')}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === 'favorites' && styles.tabTextActive,
            ]}
          >
            Favorites
          </Text>
          {activeTab === 'favorites' ? <View style={styles.tabDot} /> : null}
        </TouchableOpacity>
      </View>

      <Modal
        visible={detailsVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalBackdrop}>
      <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {screenshotsLoading ? (
                <View style={[styles.modalImage, styles.imageFallback]}>
                  <ActivityIndicator size="small" color="#31e57a" />
                </View>
              ) : screenshots.length ? (
                <FlatList
                  data={screenshots}
                  keyExtractor={(item) => `shot-${item.id}`}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  pagingEnabled
                  decelerationRate="fast"
                  snapToAlignment="start"
                  snapToInterval={SCREENSHOT_WIDTH}
                  onMomentumScrollEnd={(event) => {
                    const index = Math.round(
                      event.nativeEvent.contentOffset.x / SCREENSHOT_WIDTH
                    );
                    setActiveShotIndex(index);
                  }}
                  renderItem={({ item }) => (
                    <Image
                      source={{ uri: item.image }}
                      style={styles.modalImage}
                    />
                  )}
                />
              ) : selectedGame?.background_image ? (
                <Image
                  source={{ uri: selectedGame.background_image }}
                  style={styles.modalImage}
                />
              ) : (
                <View style={[styles.modalImage, styles.imageFallback]}>
                  <Text style={styles.imageFallbackText}>No Image</Text>
                </View>
              )}
              {screenshots.length > 1 ? (
                <View style={styles.dotsRow}>
                  {screenshots.map((shot, index) => (
                    <View
                      key={`dot-${shot.id}`}
                      style={[
                        styles.dot,
                        index === activeShotIndex && styles.dotActive,
                      ]}
                    />
                  ))}
                </View>
              ) : null}
              <Text style={styles.modalTitle}>{selectedGame?.name}</Text>
              <Text style={styles.modalMeta}>
                Release: {selectedGame?.released || 'TBA'}
              </Text>
              <Text style={styles.modalMeta}>
                Rating: {selectedGame?.rating || 'N/A'}
              </Text>
              <Text style={styles.modalMeta}>
                Genres:{' '}
                {Array.isArray(selectedGame?.genres)
                  ? selectedGame.genres.map((g) => g.name).join(', ')
                  : 'Unknown'}
              </Text>
              {selectedGame?.esrb_rating?.name ? (
                <Text style={styles.modalMeta}>
                  ESRB: {selectedGame.esrb_rating.name}
                </Text>
              ) : null}
              <Text style={styles.modalSectionTitle}>About This Game</Text>
              {detailsLoading ? (
                <Text style={styles.helperText}>Loading description...</Text>
              ) : gameDetails?.description_raw ||
                selectedGame?.description_raw ||
                selectedGame?.description ? (
                <Text style={styles.modalDescription}>
                  {gameDetails?.description_raw ||
                    selectedGame?.description_raw ||
                    selectedGame?.description}
                </Text>
              ) : (
                <Text style={styles.helperText}>No description available.</Text>
              )}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalButton}
              onPress={() => setDetailsVisible(false)}
            >
              <Text style={styles.modalButtonText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionsToggle}
              onPress={() => setActionsCollapsed((prev) => !prev)}
            >
              <Text style={styles.actionsToggleText}>
                {actionsCollapsed ? 'Show actions' : 'Hide actions'}
              </Text>
              <Text style={styles.actionsToggleText}>
                {actionsCollapsed ? '▾' : '▴'}
              </Text>
            </TouchableOpacity>
            {!actionsCollapsed ? (
              <View style={styles.actionsRow}>
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => toggleFavorite(selectedGame)}
                >
                  <Text style={styles.modalSecondaryButtonText}>
                    {favorites.some((fav) => fav.id === selectedGame?.id)
                      ? 'Remove from Favorites'
                      : 'Save to Favorites'}
                  </Text>
                </TouchableOpacity>
                {gameDetails?.website ? (
                  <TouchableOpacity
                    style={styles.modalSecondaryButton}
                    onPress={() => openExternalUrl(gameDetails.website)}
                  >
                    <Text style={styles.modalSecondaryButtonText}>Visit Website</Text>
                  </TouchableOpacity>
                ) : null}
                <TouchableOpacity
                  style={styles.modalSecondaryButton}
                  onPress={() => openTrailer(selectedGame)}
                  disabled={trailerLoading}
                >
                  <Text style={styles.modalSecondaryButtonText}>
                    {trailerLoading ? 'Loading trailer...' : 'Watch Trailer'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={filtersVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setFiltersVisible(false)}
      >
        <View style={styles.sidebarBackdrop}>
          <TouchableOpacity
            style={styles.sidebarDismiss}
            onPress={() => setFiltersVisible(false)}
            activeOpacity={1}
          />
          <View style={styles.sidebar}>
            <View style={styles.sidebarHeader}>
              <Text style={styles.sidebarTitle}>Pixora</Text>
              <TouchableOpacity
                style={styles.sidebarClose}
                onPress={() => setFiltersVisible(false)}
              >
                <Text style={styles.sidebarCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.sidebarSectionTitle}>Timeframe</Text>
              {FILTERS.map((filter) =>
                renderSidebarItem({
                  itemKey: `time-${filter.value}`,
                  label: filter.label,
                  active: selectedFilter === filter.value,
                  onPress: () => setSelectedFilter(filter.value),
                })
              )}

              <Text style={styles.sidebarSectionTitle}>Platform</Text>
              {PLATFORM_FILTERS.map((platform) =>
                renderSidebarItem({
                  itemKey: `platform-${platform.value}`,
                  label: platform.label,
                  active: platformFilter === platform.value,
                  onPress: () => setPlatformFilter(platform.value),
                })
              )}

              <Text style={styles.sidebarSectionTitle}>Language</Text>
              <View style={styles.sidebarRow}>
                {LANGUAGE_FILTERS.map((lang) => (
                  <TouchableOpacity
                    key={`lang-${lang.value}`}
                    style={[
                      styles.genreChip,
                      languageFilter === lang.value && styles.genreChipInclude,
                    ]}
                    onPress={() => setLanguageFilter(lang.value)}
                  >
                    <Text
                      style={[
                        styles.genreChipText,
                        languageFilter === lang.value && styles.genreChipTextInclude,
                      ]}
                    >
                      {lang.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.sidebarSectionTitle}>Genres</Text>
              <TouchableOpacity
                style={styles.dropdownField}
                onPress={() => setGenrePanelVisible(true)}
              >
                <Text style={styles.dropdownLabel}>{getGenreSummary()}</Text>
                <Text style={styles.dropdownArrow}>▾</Text>
              </TouchableOpacity>
              {genresLoading ? (
                <Text style={styles.helperText}>Loading genres...</Text>
              ) : !genres.length ? (
                <>
                  <Text style={styles.helperText}>No genres loaded.</Text>
                  {genreError ? (
                    <Text style={styles.errorText}>{genreError}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={fetchGenres}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </>
              ) : null}

              <Text style={styles.sidebarSectionTitle}>Content</Text>
              {renderSidebarItem({
                itemKey: 'nsfw-toggle',
                label: showNsfw ? 'NSFW On' : 'NSFW Off',
                active: showNsfw,
                onPress: () => setShowNsfw((prev) => !prev),
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={genrePanelVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setGenrePanelVisible(false)}
      >
        <View style={styles.menuBackdrop}>
          <View style={styles.genrePanel}>
            <View style={styles.genrePanelHeader}>
              <Text style={styles.genrePanelTitle}>Genres</Text>
              <TouchableOpacity
                style={styles.genrePanelClose}
                onPress={() => setGenrePanelVisible(false)}
              >
                <Text style={styles.genrePanelCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.genrePanelSearchRow}>
              <TouchableOpacity
                style={styles.genreReset}
                onPress={() => {
                  setGenreInclude([]);
                  setGenreExclude([]);
                  setPage(1);
                  setHasMore(true);
                  fetchGames({ withLoading: false, pageNumber: 1, replace: true });
                }}
              >
                <Text style={styles.genreResetText}>Reset</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.genreHint}>
              Tap once to include (green). Tap again to exclude (red). Tap
              again to clear.
            </Text>

            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.genrePanelChips}>
                {genresLoading ? (
                  <Text style={styles.helperText}>Loading genres...</Text>
                ) : null}
                {[{ id: 'all', name: 'All' }, ...genres].map((genre) => {
                  const isAll = genre.id === 'all';
                  const token = genre.slug || genre.id;
                  const isIncluded = !isAll && genreInclude.includes(token);
                  const isExcluded = !isAll && genreExclude.includes(token);
                    const isActive = isAll
                      ? !genreInclude.length && !genreExclude.length
                      : isIncluded || isExcluded;
                    return (
                      <TouchableOpacity
                        key={`panel-genre-${genre.id ?? 'all'}`}
                        style={[
                          styles.genreChip,
                          isIncluded && styles.genreChipInclude,
                          isExcluded && styles.genreChipExclude,
                          isActive && styles.genreChipActive,
                        ]}
                        onPress={() => {
                          if (isAll) {
                            setGenreInclude([]);
                            setGenreExclude([]);
                            setPage(1);
                            setHasMore(true);
                            fetchGames({ withLoading: false, pageNumber: 1, replace: true });
                            return;
                          }
                          let nextInclude = genreInclude;
                          let nextExclude = genreExclude;

                          if (!isIncluded && !isExcluded) {
                            nextInclude = [...genreInclude, token];
                            nextExclude = genreExclude.filter(
                              (genreId) => genreId !== token
                            );
                          } else if (isIncluded) {
                            nextInclude = genreInclude.filter(
                              (genreId) => genreId !== token
                            );
                            nextExclude = [...genreExclude, token];
                          } else {
                            nextExclude = genreExclude.filter(
                              (genreId) => genreId !== token
                            );
                          }

                          setGenreInclude(nextInclude);
                          setGenreExclude(nextExclude);

                          if (nextInclude.length === 0 && nextExclude.length === 0) {
                            setPage(1);
                            setHasMore(true);
                            fetchGames({ withLoading: false, pageNumber: 1, replace: true });
                          }
                        }}
                      >
                        <Text
                          style={[
                            styles.genreChipText,
                            isIncluded && styles.genreChipTextInclude,
                            isExcluded && styles.genreChipTextExclude,
                            isActive && styles.genreChipTextActive,
                          ]}
                        >
                          {genre.name}
                        </Text>
                      </TouchableOpacity>
                    );
                })}
              </View>
              {!genresLoading && !genres.length ? (
                <>
                  <Text style={styles.helperText}>No genres loaded.</Text>
                  {genreError ? (
                    <Text style={styles.errorText}>{genreError}</Text>
                  ) : null}
                  <TouchableOpacity
                    style={styles.retryButton}
                    onPress={fetchGenres}
                  >
                    <Text style={styles.retryButtonText}>Retry</Text>
                  </TouchableOpacity>
                </>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={sortMenuVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setSortMenuVisible(false)}
      >
        <View style={styles.menuBackdrop}>
          <View style={styles.menuCard}>
            {[
              { label: 'Relevance', value: 'relevance' },
              { label: 'Date added', value: 'added' },
              { label: 'Name', value: 'name' },
              { label: 'Release date', value: 'release_date' },
              { label: 'Popularity', value: 'popularity' },
              { label: 'Average rating', value: 'rating' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={styles.menuItem}
                onPress={() => {
                  setSortOption(option.value);
                  setSortMenuVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.menuItemText,
                    sortOption === option.value && styles.menuItemTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              {sortOption === option.value ? (
                <Text style={styles.menuCheck}>✓</Text>
              ) : null}
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={styles.menuClose}
              onPress={() => setSortMenuVisible(false)}
            >
              <Text style={styles.menuCloseText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b0e14',
    paddingHorizontal: 16,
  },
  backgroundGlowTop: {
    position: 'absolute',
    top: -120,
    right: -80,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(49,230,255,0.22)',
  },
  backgroundGlowBottom: {
    position: 'absolute',
    bottom: -140,
    left: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255,59,212,0.16)',
  },
  backgroundGlowAccent: {
    position: 'absolute',
    bottom: 80,
    right: -100,
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,225,73,0.18)',
  },
  homeContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 48,
  },
  header: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#f3f4f6',
    letterSpacing: 0.6,
  },
  headerIconRow: {
    flexDirection: 'row',
    gap: 6,
  },
  headerIcon: {
    padding: 4,
    backgroundColor: '#1c1c1e',
    borderRadius: 6,
  },
  headerPixelRow: {
    flexDirection: 'row',
  },
  headerPixelCell: {
    width: 4,
    height: 4,
    margin: 1,
    backgroundColor: 'transparent',
  },
  splashTitle: {
    fontSize: 48,
    fontWeight: '800',
    color: '#31e57a',
    letterSpacing: 1.2,
  },
  splashTagline: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.1,
  },
  tagCyan: {
    color: '#31e6ff',
  },
  tagMagenta: {
    color: '#ff3bd4',
  },
  tagYellow: {
    color: '#ffe149',
  },
  tagSpace: {
    color: '#ffffff',
  },
  pixelRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 14,
  },
  pixelIcon: {
    padding: 6,
    backgroundColor: '#1c1c1e',
    borderRadius: 8,
  },
  pixelRowLine: {
    flexDirection: 'row',
  },
  pixelCell: {
    width: 6,
    height: 6,
    margin: 1,
    backgroundColor: 'transparent',
  },
  subtitle: {
    fontSize: 14,
    color: '#a6aab5',
    marginTop: 6,
  },
  primaryButton: {
    marginTop: 24,
    backgroundColor: '#31e57a',
    paddingVertical: 14,
    paddingHorizontal: 26,
    borderRadius: 18,
    shadowColor: '#31e57a',
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  primaryButtonText: {
    color: '#0b120f',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#151a23',
    color: '#f3f4f6',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#253040',
  },
  suggestionsBox: {
    backgroundColor: '#141922',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#222b3a',
    paddingVertical: 6,
    marginBottom: 8,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderColor: '#222b3a',
  },
  suggestionImage: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: '#1a1f29',
  },
  suggestionTextWrap: {
    flex: 1,
  },
  suggestionText: {
    color: '#f3f4f6',
    fontWeight: '700',
  },
  suggestionMeta: {
    color: '#9aa0ad',
    fontSize: 12,
    marginTop: 2,
  },
  suggestionHint: {
    color: '#9aa0ad',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  searchButton: {
    backgroundColor: '#161b24',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#253040',
  },
  searchButtonText: {
    color: '#f3f4f6',
    fontWeight: '700',
  },
  filterToggle: {
    backgroundColor: '#161b24',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#253040',
  },
  filterToggleText: {
    color: '#f3f4f6',
    fontWeight: '700',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginVertical: 4,
  },
  sortRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  sortLabel: {
    color: '#9aa0ad',
    fontSize: 13,
    fontWeight: '700',
  },
  sortPicker: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a313d',
    backgroundColor: '#1a1f29',
  },
  sortPickerText: {
    color: '#f3f4f6',
    fontSize: 13,
    fontWeight: '700',
  },
  sortDirection: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a313d',
    backgroundColor: '#1a1f29',
  },
  sortDirectionText: {
    color: '#f3f4f6',
    fontSize: 13,
    fontWeight: '700',
  },
  section: {
    marginBottom: 10,
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#141922',
    borderWidth: 1,
    borderColor: '#222b3a',
  },
  stickySection: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#141922',
    borderWidth: 1,
    borderColor: '#222b3a',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '700',
  },
  sectionTag: {
    color: '#31e57a',
    fontSize: 12,
    fontWeight: '700',
  },
  dailyList: {
    paddingRight: 6,
  },
  dailyCard: {
    width: 160,
    marginRight: 12,
    backgroundColor: '#141922',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222b3a',
    position: 'relative',
  },
  favoriteRemove: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  favoriteRemoveText: {
    color: '#f3f4f6',
    fontSize: 10,
    fontWeight: '700',
  },
  dailyImage: {
    width: '100%',
    height: 90,
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1d222c',
  },
  imageFallbackText: {
    color: '#9aa0ad',
  },
  dailyInfo: {
    padding: 10,
  },
  dailyTitle: {
    color: '#f3f4f6',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 6,
  },
  dailyMeta: {
    color: '#9aa0ad',
    fontSize: 12,
  },
  dailyDescription: {
    color: '#c9ccd1',
    fontSize: 11,
    marginTop: 6,
  },
  dailyLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  genreList: {
    paddingRight: 6,
  },
  genreChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2a313d',
    backgroundColor: '#1a1f29',
    marginRight: 8,
  },
  genreChipActive: {
    borderColor: '#3a4252',
  },
  genreChipInclude: {
    borderColor: '#31e57a',
    backgroundColor: '#31e57a',
  },
  genreChipExclude: {
    borderColor: '#ff6b6b',
    backgroundColor: '#ff6b6b',
  },
  genreChipText: {
    color: '#f3f4f6',
    fontSize: 12,
    fontWeight: '700',
  },
  genreChipTextActive: {
    color: '#f3f4f6',
  },
  genreChipTextInclude: {
    color: '#0b120f',
  },
  genreChipTextExclude: {
    color: '#111318',
  },
  listContent: {
    paddingTop: 8,
    paddingBottom: 180,
  },
  listWrapper: {
    flex: 1,
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  layoutRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
    marginTop: 6,
  },
  headerBlock: {
    marginBottom: 10,
  },
  headerAnimated: {
    overflow: 'hidden',
  },
  layoutButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: '#1a1f29',
    borderWidth: 1,
    borderColor: '#2a313d',
  },
  layoutButtonActive: {
    backgroundColor: '#31e57a',
    borderColor: '#31e57a',
  },
  layoutButtonText: {
    color: '#f3f4f6',
    fontWeight: '700',
    fontSize: 12,
  },
  layoutButtonTextActive: {
    color: '#0f1a12',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 40,
  },
  helperText: {
    color: '#9aa0ad',
    marginTop: 12,
  },
  errorText: {
    color: '#ff7a7a',
    fontSize: 15,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#151922',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '85%',
  },
  modalImage: {
    width: SCREENSHOT_WIDTH,
    height: 220,
    borderRadius: 16,
    marginBottom: 12,
    marginRight: 12,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 6,
    marginBottom: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#3a4252',
  },
  dotActive: {
    backgroundColor: '#31e57a',
    width: 14,
  },
  modalTitle: {
    color: '#f3f4f6',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalMeta: {
    color: '#9aa0ad',
    fontSize: 13,
    marginBottom: 6,
  },
  modalSectionTitle: {
    color: '#31e57a',
    fontSize: 14,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 6,
  },
  modalDescription: {
    color: '#c9ccd1',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 8,
  },
  undoBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1f29',
    borderWidth: 1,
    borderColor: '#2a313d',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  undoText: {
    color: '#f3f4f6',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  undoButton: {
    backgroundColor: '#31e57a',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
  },
  undoButtonText: {
    color: '#0f1a12',
    fontWeight: '700',
    fontSize: 12,
  },
  favoritesScroll: {
    paddingBottom: 160,
  },
  favoriteListCard: {
    backgroundColor: '#151922',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#232a36',
    padding: 12,
    marginBottom: 12,
  },
  favoriteListRow: {
    flexDirection: 'row',
    gap: 10,
  },
  favoriteThumb: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  favoriteListInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  favoriteDelete: {
    marginTop: 10,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#2a313d',
  },
  favoriteDeleteText: {
    color: '#f3f4f6',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#10141c',
    borderWidth: 1,
    borderColor: '#222b3a',
    paddingVertical: 12,
    borderRadius: 22,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  tabItem: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 22,
    borderRadius: 18,
  },
  tabItemActive: {
    backgroundColor: '#1f2a1f',
    borderWidth: 1,
    borderColor: '#31e57a',
  },
  tabText: {
    color: '#f3f4f6',
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#31e57a',
  },
  tabDot: {
    marginTop: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#31e57a',
  },
  scrollTopButton: {
    backgroundColor: '#31e57a',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  scrollTopButtonText: {
    color: '#0f1a12',
    fontWeight: '800',
  },
  scrollTopWrap: {
    position: 'absolute',
    right: 18,
    bottom: 90,
  },
  modalButton: {
    marginTop: 12,
    backgroundColor: '#31e57a',
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#0f1a12',
    fontWeight: '700',
  },
  modalSecondaryButton: {
    marginTop: 10,
    backgroundColor: '#1a1f29',
    paddingVertical: 12,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a313d',
  },
  modalSecondaryButtonText: {
    color: '#f3f4f6',
    fontWeight: '700',
  },
  actionsToggle: {
    marginTop: 10,
    backgroundColor: '#1a1f29',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2a313d',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsToggleText: {
    color: '#f3f4f6',
    fontWeight: '700',
  },
  actionsRow: {
    marginTop: 10,
    gap: 8,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  menuCard: {
    backgroundColor: '#151922',
    borderRadius: 16,
    padding: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  menuItemText: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
  },
  menuItemTextActive: {
    color: '#31e57a',
  },
  menuCheck: {
    color: '#31e57a',
    fontSize: 16,
    fontWeight: '700',
  },
  menuClose: {
    marginTop: 6,
    alignItems: 'center',
    paddingVertical: 8,
  },
  menuCloseText: {
    color: '#f3f4f6',
    fontWeight: '700',
  },
  sidebarBackdrop: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  sidebarDismiss: {
    flex: 1,
  },
  sidebar: {
    width: 270,
    backgroundColor: '#2b2b2b',
    paddingTop: 18,
    paddingHorizontal: 14,
    paddingBottom: 18,
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  sidebarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sidebarTitle: {
    color: '#f3f4f6',
    fontSize: 18,
    fontWeight: '800',
  },
  sidebarSectionTitle: {
    color: '#c0c0c0',
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 12,
    marginBottom: 6,
  },
  sidebarGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
  },
  sidebarGroupTitleWrap: {
    flex: 1,
    paddingRight: 8,
  },
  sidebarGroupSummary: {
    color: '#9aa0ad',
    fontSize: 11,
    marginTop: 4,
  },
  sidebarGroupArrow: {
    color: '#c0c0c0',
    fontSize: 16,
    fontWeight: '700',
    paddingRight: 4,
  },
  dropdownField: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ff6b46',
    backgroundColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownLabel: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '700',
  },
  dropdownArrow: {
    color: '#f3f4f6',
    fontSize: 16,
  },
  genrePanel: {
    backgroundColor: '#2b2b2b',
    borderRadius: 16,
    padding: 16,
    width: '92%',
    maxHeight: '85%',
  },
  genrePanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  genrePanelTitle: {
    color: '#f3f4f6',
    fontSize: 16,
    fontWeight: '800',
  },
  genrePanelClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#3a3a3a',
  },
  genrePanelCloseText: {
    color: '#f3f4f6',
    fontWeight: '800',
  },
  genrePanelSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  genreReset: {
    backgroundColor: '#3a3a3a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  genreResetText: {
    color: '#ff6b46',
    fontWeight: '700',
  },
  genreHint: {
    color: '#9aa0ad',
    fontSize: 11,
    marginBottom: 10,
  },
  genrePanelChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  retryButton: {
    marginTop: 8,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#3a3a3a',
  },
  retryButtonText: {
    color: '#f3f4f6',
    fontWeight: '700',
    fontSize: 12,
  },
  sidebarItem: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: 'transparent',
  },
  sidebarItemActive: {
    backgroundColor: '#ff6b46',
  },
  sidebarItemText: {
    color: '#f3f4f6',
    fontSize: 14,
    fontWeight: '600',
  },
  sidebarItemTextActive: {
    color: '#1b1b1b',
    fontWeight: '800',
  },
  sidebarClose: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    backgroundColor: '#3a3a3a',
  },
  sidebarCloseText: {
    color: '#f3f4f6',
    fontWeight: '800',
  },
});
