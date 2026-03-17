# Pixora

Pixora is a game discovery app built with React Native + Expo using the RAWG API.

## What API did you use?
I used the RAWG Video Games Database API as the main public API. RAWG provides a regularly updated catalog of games with metadata such as titles, genres, platforms, ratings, release dates, descriptions, screenshots, and trailers. The app fetches game lists, genres, screenshots, and trailer links from RAWG endpoints and presents them in an interactive way.

## What problem does your app solve?
Pixora solves the problem of discovering and saving games efficiently. Instead of browsing raw data, users can quickly search, filter, and sort games by timeframe, platform, language, and genres. The interface presents results as cards and allows users to view detailed descriptions, screenshots, and trailers. Users can also save favorites for later, even offline. The goal is to transform a large and overwhelming game database into a focused, user‑friendly discovery tool.

## What was the most difficult part of the integration?
The hardest part was handling data variability and UI behavior. RAWG sometimes returns missing images, descriptions, or trailers. I had to implement fallback logic, loading states, and error handling to keep the interface stable. Another challenge was building advanced filtering, especially the genre include/exclude system and making it intuitive. Ensuring that pagination, search, filters, and layout modes all worked together without conflicts required careful state management.

## What would you improve with more time?
With more time, I would improve offline support by caching more than just genres, such as the last successful game list and selected details. I would also add additional APIs for richer features, such as OpenCritic for review scores or IsThereAnyDeal for price tracking. Finally, I would refine the UI with icon‑based controls, improved accessibility, and stronger animations for transitions.
