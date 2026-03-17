import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function GameCard({
  game,
  onPress,
  description,
  isFavorite,
  onToggleFavorite,
  compact = false,
}) {
  // Compact mode is used in grid/compact layouts to reduce visual noise.
  const screenWidth = Dimensions.get('window').width;
  const cardWidth = compact ? (screenWidth - 32 - 12) / 2 : screenWidth - 32;
  const imageHeight = compact ? 140 : 180;
  const genres = Array.isArray(game.genres)
    ? game.genres.map((genre) => genre.name).join(', ')
    : 'Unknown';
  const [expanded, setExpanded] = useState(false);
  const hasDescription = Boolean(description && description.trim());
  const canToggle = hasDescription && description.length > 120;
  const showDescription = !compact && hasDescription;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      style={[
        styles.card,
        compact && styles.cardCompact,
        { width: cardWidth },
      ]}
      onPress={onPress}
    >
      <View
        style={[
          styles.imageShell,
          { width: cardWidth, height: imageHeight },
        ]}
      >
        {Array.isArray(game.short_screenshots) &&
        game.short_screenshots.length ? (
          <FlatList
            data={game.short_screenshots}
            keyExtractor={(item) => String(item.id)}
            horizontal
            showsHorizontalScrollIndicator={false}
            pagingEnabled
            snapToAlignment="start"
            snapToInterval={cardWidth}
            decelerationRate="fast"
            renderItem={({ item }) => (
              <Image
                source={{ uri: item.image }}
                style={[styles.image, { width: cardWidth, height: imageHeight }]}
                resizeMode="cover"
              />
            )}
          />
        ) : game.background_image ? (
          <Image
            source={{ uri: game.background_image }}
            style={[styles.image, { width: cardWidth, height: imageHeight }]}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.image,
              styles.imageFallback,
              { width: cardWidth, height: imageHeight },
            ]}
          >
            <Text style={styles.imageFallbackText}>No Image</Text>
          </View>
        )}
      </View>
      <View style={[styles.content, compact && styles.contentCompact]}>
        <View style={[styles.titleRow, compact && styles.titleRowCompact]}>
          <Text
            style={[styles.title, compact && styles.titleCompact]}
            numberOfLines={2}
          >
            {game.name}
          </Text>
          <TouchableOpacity
            style={[
              styles.favoriteButton,
              isFavorite && styles.favoriteButtonActive,
              compact && styles.favoriteButtonCompact,
            ]}
            onPress={onToggleFavorite}
          >
            <Text
              style={[
                styles.favoriteText,
                isFavorite && styles.favoriteTextActive,
                compact && styles.favoriteTextCompact,
              ]}
            >
              {isFavorite ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.meta}>Release: {game.released || 'TBA'}</Text>
        <Text style={styles.meta}>Rating: {game.rating || 'N/A'}</Text>
        <Text style={styles.genres} numberOfLines={2}>
          {genres}
        </Text>
        {showDescription ? (
          <>
            <Text
              style={styles.description}
              numberOfLines={expanded ? undefined : 2}
            >
              {description}
            </Text>
            {canToggle ? (
              <TouchableOpacity
                style={styles.moreButton}
                onPress={() => setExpanded((prev) => !prev)}
              >
                <Text style={styles.moreText}>
                  {expanded ? 'See less' : 'See more'}
                </Text>
              </TouchableOpacity>
            ) : null}
          </>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#141922',
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#222b3a',
  },
  cardCompact: {
    marginBottom: 16,
  },
  image: {
  },
  imageFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1b202a',
  },
  imageShell: {
    backgroundColor: '#12161d',
    borderBottomWidth: 1,
    borderColor: '#222b3a',
  },
  imageFallbackText: {
    color: '#b0b3b8',
  },
  content: {
    padding: 14,
  },
  contentCompact: {
    padding: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  titleRowCompact: {
    alignItems: 'flex-start',
  },
  title: {
    color: '#f5f5f7',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
    flex: 1,
  },
  titleCompact: {
    fontSize: 15,
    minHeight: 36,
    marginBottom: 4,
  },
  favoriteButton: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0d0d0',
    backgroundColor: '#f2f2f2',
  },
  favoriteButtonActive: {
    borderColor: '#31e57a',
    backgroundColor: '#31e57a',
  },
  favoriteButtonCompact: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  favoriteText: {
    color: '#1c1c1c',
    fontSize: 12,
    fontWeight: '700',
  },
  favoriteTextCompact: {
    fontSize: 10,
  },
  favoriteTextActive: {
    color: '#0f1a12',
  },
  meta: {
    color: '#b0b3b8',
    fontSize: 13,
    marginBottom: 4,
  },
  genres: {
    color: '#31e57a',
    fontSize: 13,
    marginTop: 6,
  },
  description: {
    color: '#c9ccd1',
    fontSize: 12,
    marginTop: 8,
    lineHeight: 16,
  },
  moreButton: {
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  moreText: {
    color: '#31e57a',
    fontSize: 12,
    fontWeight: '700',
  },
});
