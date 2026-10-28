import { useCallback, useEffect, useRef, useState } from "react";
import {
  Clock,
  Users,
  MessageCircle,
  Play,
  Send,
  Database,
  DownloadCloud,
  Captions,
  ArrowLeft,
  VideoOff,
  Heart,
  Gauge,
} from "lucide-react";

import ReelSpinner from "../components/ReelSpinner.jsx";
import { RatingBadge } from "../components/PosterCard.jsx";
import { authFetch } from "../utils/auth.js";
import { useLanguage } from "../i18n/LanguageContext.jsx";
import { tr } from "../i18n/core.js";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3001";

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function VideoPage({
  movie,
  onBack,
  onOpenProfile,
}) {
  const { t, tGenre, lang } = useLanguage();
  const [comments, setComments] = useState([]);
  const [draft, setDraft] = useState("");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [movieDetails, setMovieDetails] = useState(null);
  const [playerError, setPlayerError] = useState(false);

  const videoRef = useRef(null);

  const fetchComments = useCallback(async (movieId) => {
    try {
      const response = await authFetch(`${API_URL}/movies/${movieId}/comments`);
      if (response.ok) {
        const data = await response.json();
        setComments(Array.isArray(data) ? data : []);
      }
    } catch {
      /* ignore */
    }
  }, []);

  /*
   * Load the complete movie details & comments.
   */
  useEffect(() => {
    if (!movie?.id) return;

    const loadMovie = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await authFetch(
          `${API_URL}/movies/${movie.id}`
        );

        if (!response.ok) {
          throw new Error(
            tr("video.err.load", { status: response.status })
          );
        }

        const data = await response.json();
        setMovieDetails(data);

        await fetchComments(movie.id);
      } catch (err) {
        console.error("Movie details error:", err);

        setError(
          err.message || tr("video.err.generic")
        );
      } finally {
        setLoading(false);
      }
    };

    loadMovie();
  }, [movie?.id, fetchComments]);

  if (!movie) {
    return null;
  }

  if (loading) {
    return (
      <div className="ht-video">
        <div className="ht-video__loading">
          <ReelSpinner
            size={50}
            label={t("video.loading")}
          />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ht-video">
        <button
          className="ht-back"
          onClick={onBack}
        >
          <ArrowLeft size={15} />
          {t("video.back")}
        </button>

        <div className="ht-auth__error">
          {error}
        </div>
      </div>
    );
  }

  const currentMovie = movieDetails || movie;

  // Show subtitles in the user's language when we have them, otherwise English.
  const subtitleLang = (currentMovie.subtitles || []).some((s) => s.lang === lang) ? lang : "en";

  // The session cookie is sent with the stream request (see crossOrigin below).
  const streamUrl =
    currentMovie.streamUrl || `${API_URL}/movies/${currentMovie.id}/stream`;

  const addComment = async () => {
    if (!draft.trim()) return;
    const text = draft.trim();
    setDraft("");

    try {
      const response = await authFetch(`${API_URL}/movies/${currentMovie.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment: text }),
      });

      if (response.ok) {
        await fetchComments(currentMovie.id);
      }
    } catch (err) {
      console.error("Failed to post comment:", err);
    }
  };

  const handleSpeedChange = (speed) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  };

  const handleLikeComment = async (commentId) => {
    const target = comments.find((c) => c.id === commentId);
    if (!target) return;

    const willBeLiked = !target.isLiked;
    const optimisticCount = Math.max(
      0,
      (target.likesCount || 0) + (willBeLiked ? 1 : -1)
    );

    // Optimistically update
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? { ...c, isLiked: willBeLiked, likesCount: optimisticCount }
          : c
      )
    );

    try {
      const res = await authFetch(`${API_URL}/comments/${commentId}/like`, {
        method: "POST",
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) =>
          prev.map((c) =>
            c.id === commentId
              ? {
                  ...c,
                  likesCount: typeof data.likesCount === "number" ? data.likesCount : optimisticCount,
                  isLiked: typeof data.isLiked === "boolean" ? data.isLiked : willBeLiked,
                }
              : c
          )
        );
      }
    } catch (err) {
      console.error("Failed to toggle like on comment:", err);
    }
  };

  return (
    <div className="ht-video">

      {/* Back */}
      <button
        className="ht-back"
        onClick={onBack}
      >
        <ArrowLeft size={15} />
        {t("video.back")}
      </button>

      {/* Movie header */}
      <div className="ht-video__backdrop">

        <div className="ht-video__backdrop-scrim" />

        <div className="ht-video__header">

          <div
            className="ht-video__cover"
            style={{
              backgroundImage: currentMovie.posterUrl
                ? `url(${currentMovie.posterUrl})`
                : undefined,
            }}
          >
            {!currentMovie.posterUrl && (
              <span>
                {currentMovie.title?.[0] || "?"}
              </span>
            )}
          </div>

          <div>
            <h1 className="ht-display ht-video__title">
              {currentMovie.title}
            </h1>

            <div className="ht-video__meta">

              {currentMovie.runtime && (
                <span>
                  <Clock size={13} />
                  {t("video.runtime", { n: currentMovie.runtime })}
                </span>
              )}

              {currentMovie.year && (
                <span>
                  {currentMovie.year}
                </span>
              )}

              {currentMovie.rating != null && (
                <RatingBadge
                  rating={Number(currentMovie.rating)}
                />
              )}

              {currentMovie.genres?.length > 0 && (
                <span className="ht-tag">
                  {tGenre(currentMovie.genres[0])}
                </span>
              )}

              <span className="ht-tag ht-tag--status">
                {currentMovie.archiveIdentifier ? (
                  <>
                    <Database size={12} />
                    {t("video.onServer")}
                  </>
                ) : (
                  <>
                    <DownloadCloud size={12} />
                    {t("video.torrent")}
                  </>
                )}
              </span>

            </div>
          </div>

        </div>
      </div>

      {/* Body */}
      <div className="ht-video__body">

        {/* REAL VIDEO PLAYER */}
        <section className="ht-player">

          {streamUrl && !playerError ? (
            <>
              <video
                ref={videoRef}
                className="ht-player__video"
                controls
                autoPlay
                playsInline
                preload="metadata"
                crossOrigin="use-credentials"
                poster={currentMovie.posterUrl || undefined}
                src={streamUrl}
                onPlay={(e) => {
                  const videoEl = e.currentTarget;
                  if (videoEl && videoEl.textTracks) {
                    for (let i = 0; i < videoEl.textTracks.length; i++) {
                      if (videoEl.textTracks[i].language === subtitleLang) {
                        videoEl.textTracks[i].mode = 'showing';
                      }
                    }
                  }
                  authFetch(`${API_URL}/movies/${currentMovie.id}/watch`, { method: "POST" }).catch(() => {});
                }}
                onError={() => {
                  setPlayerError(true);
                }}
              >
                {(currentMovie.subtitles || []).map((sub) => (
                  <track
                    key={sub.lang}
                    kind="subtitles"
                    src={sub.url}
                    srcLang={sub.lang}
                    label={sub.label}
                    default={sub.lang === subtitleLang}
                  />
                ))}
              </video>

              {/* Bonus: Player Speed Controls Bar */}
              <div className="ht-player__controls-bar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--ink-dim)' }}>
                  <Gauge size={14} />
                  <span>{t("video.speed")}</span>
                </div>
                <div className="ht-speed-buttons">
                  {SPEED_OPTIONS.map((spd) => (
                    <button
                      key={spd}
                      type="button"
                      className={`ht-speed-btn ${playbackSpeed === spd ? "is-active" : ""}`}
                      onClick={() => handleSpeedChange(spd)}
                    >
                      {spd === 1 ? t("video.speedNormal") : `${spd}x`}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="ht-player__buffering" style={{ flexDirection: 'column', gap: '12px', textAlign: 'center', padding: '40px 20px' }}>
              <VideoOff size={44} style={{ color: 'var(--ink-dim)', opacity: 0.7 }} />
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--ink)' }}>
                {t("video.unavailable.title")}
              </div>
              <div style={{ fontSize: '13.5px', color: 'var(--ink-dim)', maxWidth: '420px', lineHeight: 1.5 }}>
                {t("video.unavailable.desc")}
              </div>
            </div>
          )}

        </section>

        {/* Movie information */}
        <div className="ht-video__grid">

          <section className="ht-panel">
            <h3 className="ht-panel__heading">
              {t("video.synopsis")}
            </h3>

            <p className="ht-panel__text">
              {currentMovie.overview ||
                t("video.noSynopsis")}
            </p>
          </section>

          <section className="ht-panel">

            <h3 className="ht-panel__heading">
              {t("video.cast")}
            </h3>

            {currentMovie.cast?.length > 0 ? (
              <ul className="ht-cast">
                {currentMovie.cast
                  .slice(0, 8)
                  .map((person, index) => (
                    <li key={`${person.name}-${index}`}>
                      <strong>
                        {person.job || t("video.castDefault")}
                      </strong>

                      <span>
                        {person.name}
                        {person.character
                          ? ` — ${person.character}`
                          : ""}
                      </span>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="ht-panel__text">
                {t("video.noCast")}
              </p>
            )}

          </section>

        </div>

        {/* Comments */}
        <section className="ht-panel">

          <h3 className="ht-panel__heading">
            <MessageCircle size={15} />
            {t("video.comments", { n: comments.length })}
          </h3>

          <div className="ht-comments">

            {comments.map((comment) => {
              const authorName = comment.authorUsername || comment.author?.username || comment.author?.fullName || t("video.user");
              const contentText = comment.content || comment.text || "";
              const authorId = comment.authorId || comment.author?.id;
              const avatarUrl = comment.authorAvatarUrl || comment.author?.avatarUrl;
              const initials = authorName.slice(0, 2).toUpperCase();
              const likesCount = comment.likesCount || 0;
              const isLiked = Boolean(comment.isLiked);

              return (
                <div
                  key={comment.id}
                  className="ht-comment"
                >
                  <button
                    type="button"
                    className="ht-comment__avatar"
                    onClick={() => authorId && onOpenProfile?.(authorId)}
                    title={authorId ? t("video.viewProfile", { name: authorName }) : undefined}
                    style={{
                      background: avatarUrl ? undefined : "rgba(224, 86, 36, 0.2)",
                      backgroundImage: avatarUrl ? `url(${avatarUrl})` : undefined,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      color: "var(--marquee)",
                      cursor: authorId ? "pointer" : "default",
                    }}
                  >
                    {!avatarUrl && initials}
                  </button>

                  <div style={{ flex: 1 }}>
                    <button
                      type="button"
                      className="ht-comment__author"
                      onClick={() => authorId && onOpenProfile?.(authorId)}
                      style={{
                        background: "none",
                        border: "none",
                        padding: 0,
                        font: "inherit",
                        fontWeight: 600,
                        color: "var(--marquee)",
                        cursor: authorId ? "pointer" : "default",
                        textAlign: "left",
                        display: "inline-block",
                      }}
                      title={authorId ? t("video.viewProfile", { name: authorName }) : undefined}
                    >
                      @{authorName}
                    </button>

                    <div className="ht-comment__text">
                      {contentText}
                    </div>

                    {/* Bonus: Like comment button */}
                    <div className="ht-comment__footer">
                      <button
                        type="button"
                        className={`ht-comment__like-btn ${isLiked ? "is-liked" : ""}`}
                        onClick={() => handleLikeComment(comment.id)}
                        title={t("video.likeTitle")}
                      >
                        <Heart size={12} fill={isLiked ? "var(--marquee)" : "none"} />
                        <span>{likesCount > 0 ? likesCount : t("video.like")}</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}


          </div>

          <div className="ht-comment-form">

            <input
              value={draft}
              onChange={(event) =>
                setDraft(event.target.value)
              }
              placeholder={t("video.commentPlaceholder")}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  addComment();
                }
              }}
            />

            <button onClick={addComment}>
              <Send size={15} />
            </button>

          </div>

        </section>

      </div>
    </div>
  );
}