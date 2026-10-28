import { useEffect, useMemo, useRef, useState } from "react";
import { SlidersHorizontal, Eye, Star, Calendar } from "lucide-react";

import PosterCard from "../components/PosterCard.jsx";
import ReelSpinner from "../components/ReelSpinner.jsx";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { tr } from "../i18n/core.js";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

const SORTS = [
  { value: "name", labelKey: "library.sort.name" },
  { value: "rating", labelKey: "library.sort.rating" },
  { value: "year", labelKey: "library.sort.year" },
];

const WATCHED_OPTIONS = [
  { value: "all", labelKey: "library.watched.all" },
  { value: "unwatched", labelKey: "library.watched.unwatched" },
  { value: "watched", labelKey: "library.watched.watched" },
];

const RATING_OPTIONS = [
  { value: "0", labelKey: "library.rating.all" },
  { value: "5", label: "5.0+ ⭐" },
  { value: "7", label: "7.0+ ⭐" },
  { value: "8", label: "8.0+ ⭐" },
];

const ERA_OPTIONS = [
  { value: "all", labelKey: "library.era.all" },
  { value: "2020s", labelKey: "library.era.2020s" },
  { value: "2010s", labelKey: "library.era.2010s" },
  { value: "2000s", labelKey: "library.era.2000s" },
  { value: "classic", labelKey: "library.era.classic" },
];

export default function LibraryPage({ query = "", onOpen }) {
  const { t, tGenre } = useLanguage();
  const [movies, setMovies] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [genre, setGenre] = useState("All");
  const [sort, setSort] = useState("name");
  const [watchedFilter, setWatchedFilter] = useState("all");
  const [minRating, setMinRating] = useState("0");
  const [eraFilter, setEraFilter] = useState("all");

  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");

  const sentinelRef = useRef(null);

  /*
   * --------------------------------------------------
   * Reset page & movies when query changes
   * --------------------------------------------------
   */
  useEffect(() => {
    setPage(1);
    setMovies([]);
    setHasMore(true);
  }, [query]);

  /*
   * --------------------------------------------------
   * Fetch movies from backend (supports query & page)
   * --------------------------------------------------
   */
  useEffect(() => {
    let cancelled = false;

    const fetchMovies = async () => {
      try {
        if (page === 1) {
          setLoading(true);
        } else {
          setLoadingMore(true);
        }
        setError("");

        const params = new URLSearchParams();
        if (query.trim()) {
          params.set("query", query.trim());
        }
        params.set("page", String(page));

        // Auth lives in HttpOnly cookies, so just include credentials.
        // The library is public: it works with or without a session.
        const response = await fetch(`${API_URL}/movies?${params.toString()}`, {
          credentials: "include",
        });

        if (!response.ok) {
          throw new Error(tr("library.err.load", { status: response.status }));
        }

        const data = await response.json();
        const movieList = Array.isArray(data)
          ? data
          : Array.isArray(data.movies)
            ? data.movies
            : [];

        if (!cancelled) {
          if (page === 1) {
            setMovies(movieList);
          } else {
            setMovies((prev) => {
              // Deduplicate by id
              const existingIds = new Set(prev.map((m) => m.id));
              const newItems = movieList.filter((m) => !existingIds.has(m.id));
              return [...prev, ...newItems];
            });
          }

          setHasMore(movieList.length >= 20);
        }
      } catch (err) {
        console.error("Movie loading error:", err);
        if (!cancelled) {
          setError(err.message || tr("library.err.generic"));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setLoadingMore(false);
        }
      }
    };

    fetchMovies();

    return () => {
      cancelled = true;
    };
  }, [query, page]);

  /*
   * --------------------------------------------------
   * Infinite scroll observer (Subject Section III.2.2:
   * "next page being loaded asynchronously as the user
   * scrolls down. There should be no link to load the next page.")
   * --------------------------------------------------
   */
  useEffect(() => {
    if (!sentinelRef.current || !hasMore || loading || loadingMore) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          setPage((prev) => prev + 1);
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, loadingMore]);


  /*
   * --------------------------------------------------
   * Build genre list dynamically
   * --------------------------------------------------
   */
  const genres = useMemo(() => {
    const values = new Set();

    (movies || []).forEach((movie) => {
      const gList = movie.genres || movie.genre;
      if (Array.isArray(gList)) {
        gList.forEach((g) => {
          if (g) values.add(String(g));
        });
      } else if (gList) {
        values.add(String(gList));
      }
    });

    return ["All", ...Array.from(values).sort()];
  }, [movies]);

  /*
   * --------------------------------------------------
   * Search + genre + sorting
   * --------------------------------------------------
   */
  const filteredAndSorted = useMemo(() => {
    const search = query.trim().toLowerCase();

    const filtered = (movies || []).filter((movie) => {
      const title = String(movie.title || "").toLowerCase();

      /*
       * Search title
       */
      const matchesSearch =
        !search || title.includes(search);

      /*
       * Genre
       */
      let matchesGenre = true;
      if (genre !== "All") {
        const gList = movie.genres || movie.genre;
        if (Array.isArray(gList)) {
          matchesGenre = gList.some(
            (g) => String(g).toLowerCase() === genre.toLowerCase()
          );
        } else {
          matchesGenre = String(gList || "").toLowerCase() === genre.toLowerCase();
        }
      }

      /*
       * Watched status (Bonus)
       */
      let matchesWatched = true;
      if (watchedFilter === "watched") {
        matchesWatched = Boolean(movie.watched);
      } else if (watchedFilter === "unwatched") {
        matchesWatched = !movie.watched;
      }

      /*
       * Minimum rating (Bonus)
       */
      let matchesRating = true;
      if (Number(minRating) > 0) {
        matchesRating = Number(movie.rating ?? 0) >= Number(minRating);
      }

      /*
       * Release era / year (Bonus)
       */
      let matchesEra = true;
      const y = Number(movie.year ?? 0);
      if (eraFilter === "2020s") {
        matchesEra = y >= 2020;
      } else if (eraFilter === "2010s") {
        matchesEra = y >= 2010 && y < 2020;
      } else if (eraFilter === "2000s") {
        matchesEra = y >= 2000 && y < 2010;
      } else if (eraFilter === "classic") {
        matchesEra = y > 0 && y < 2000;
      }

      return matchesSearch && matchesGenre && matchesWatched && matchesRating && matchesEra;
    });

    /*
     * Never mutate original movies array
     */
    return [...filtered].sort((a, b) => {
      /*
       * Name
       */
      if (sort === "name") {
        return String(a.title || "").localeCompare(
          String(b.title || "")
        );
      }

      /*
       * Rating
       */
      if (sort === "rating") {
        return (
          Number(b.rating ?? 0) -
          Number(a.rating ?? 0)
        );
      }

      /*
       * Production year
       */
      if (sort === "year") {
        return (
          Number(b.year ?? 0) -
          Number(a.year ?? 0)
        );
      }

      return 0;
    });
  }, [movies, query, genre, sort, watchedFilter, minRating, eraFilter]);

  /*
   * --------------------------------------------------
   * Loading
   * --------------------------------------------------
   */
  if (loading) {
    return (
      <div className="ht-library">
        <div className="ht-sentinel">
          <ReelSpinner
            size={34}
            label={t("library.loading")}
          />
        </div>
      </div>
    );
  }

  /*
   * --------------------------------------------------
   * Page
   * --------------------------------------------------
   */
  return (
    <div className="ht-library">

      {/* -------------------------------------------- */}
      {/* Filters */}
      {/* -------------------------------------------- */}

      <div className="ht-library__bar">

        {/* Genres */}
        <div className="ht-chips">
          {genres.map((g) => (
            <button
              key={g}
              type="button"
              className={`ht-chip ${
                genre === g ? "is-active" : ""
              }`}
              onClick={() => setGenre(g)}
            >
              {g === "All" ? t("library.genre.all") : tGenre(g)}
            </button>
          ))}
        </div>

        {/* Controls Bar: Filters + Sort */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Watched Status Filter */}
          <div className="ht-sort">
            <Eye size={13} />
            <select
              value={watchedFilter}
              onChange={(e) => setWatchedFilter(e.target.value)}
              className="ht-sort__select"
            >
              {WATCHED_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.labelKey ? t(item.labelKey) : item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Min Rating Filter */}
          <div className="ht-sort">
            <Star size={13} />
            <select
              value={minRating}
              onChange={(e) => setMinRating(e.target.value)}
              className="ht-sort__select"
            >
              {RATING_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.labelKey ? t(item.labelKey) : item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Era Filter */}
          <div className="ht-sort">
            <Calendar size={13} />
            <select
              value={eraFilter}
              onChange={(e) => setEraFilter(e.target.value)}
              className="ht-sort__select"
            >
              {ERA_OPTIONS.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.labelKey ? t(item.labelKey) : item.label}
                </option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="ht-sort">
            <SlidersHorizontal size={13} />
            <select
              value={sort}
              onChange={(event) =>
                setSort(event.target.value)
              }
              className="ht-sort__select"
            >
              {SORTS.map((item) => (
                <option
                  key={item.value}
                  value={item.value}
                >
                  {item.labelKey ? t(item.labelKey) : item.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* -------------------------------------------- */}
      {/* Search information */}
      {/* -------------------------------------------- */}

      <div className="ht-library__info">

        <p className="ht-library__hint">
          {query.trim()
            ? t("library.results", { query })
            : t("library.popular")}
        </p>

        <span className="ht-library__count">
          {filteredAndSorted.length}{" "}
          {filteredAndSorted.length === 1
            ? t("library.count.one")
            : t("library.count.other")}
        </span>

      </div>

      {/* -------------------------------------------- */}
      {/* Error */}
      {/* -------------------------------------------- */}

      {error && (
        <div className="ht-auth__error">
          {error}
        </div>
      )}

      {/* -------------------------------------------- */}
      {/* Empty state */}
      {/* -------------------------------------------- */}

      {!error &&
        filteredAndSorted.length === 0 && (
          <div className="ht-library__empty">
            <p>{t("library.empty")}</p>

            {query && (
              <span>
                {t("library.emptyHint")}
              </span>
            )}
          </div>
        )}

      {/* -------------------------------------------- */}
      {/* Movie grid */}
      {/* -------------------------------------------- */}

      {!error &&
        filteredAndSorted.length > 0 && (
          <>
            <div className="ht-grid">
              {filteredAndSorted.map((movie) => (
                <PosterCard
                  key={movie.id}
                  movie={movie}
                  onOpen={onOpen}
                />
              ))}
            </div>

            {/* Infinite Scroll Sentinel */}
            <div
              ref={sentinelRef}
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '40px 0 20px',
                minHeight: '80px',
              }}
            >
              {loadingMore && (
                <ReelSpinner size={28} label={t("library.loadingMore")} />
              )}
            </div>
          </>
        )}

    </div>
  );
}