import { Star, Play } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext.jsx";

export function RatingBadge({ rating }) {
  const value = Number(rating);

  if (!Number.isFinite(value)) {
    return null;
  }

  return (
    <div className="ht-rating">
      <Star
        size={11}
        fill="var(--marquee)"
        stroke="var(--marquee)"
      />
      {value.toFixed(1)}
    </div>
  );
}

export default function PosterCard({ movie, onOpen }) {
  const { t } = useLanguage();

  /*
   * Make sure the title always exists
   */
  const title = movie?.title || t("poster.unknown");

  /*
   * Backend may return:
   *
   * grad: ["#123", "#456"]
   *
   * If it doesn't, use default colors.
   */
  const grad =
    Array.isArray(movie?.grad) && movie.grad.length >= 2
      ? movie.grad
      : ["#27272a", "#18181b"];

  /*
   * Support both posterUrl and poster_url
   */
  const posterUrl =
    movie?.posterUrl ||
    movie?.poster_url ||
    movie?.poster ||
    null;

  return (
    <button
      type="button"
      className="ht-poster"
      onClick={() => onOpen?.(movie)}
    >
      <div
        className="ht-poster__art"
        style={{
          background: posterUrl
            ? undefined
            : `linear-gradient(155deg, ${grad[0]}, ${grad[1]})`,
          backgroundImage: posterUrl
            ? `url("${posterUrl}")`
            : undefined,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Show title initial only when there is no poster */}
        {!posterUrl && (
          <span className="ht-poster__initial">
            {title[0].toUpperCase()}
          </span>
        )}

        <RatingBadge rating={movie?.rating} />

        {movie?.watched ? (
          <span
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              background: 'rgba(34, 197, 94, 0.9)',
              color: '#ffffff',
              fontSize: '10px',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '4px',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              backdropFilter: 'blur(4px)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
            }}
            title={t("poster.watched")}
          >
            {t("poster.watched")}
          </span>
        ) : (
          <span
            className="ht-dot"
            title={t("poster.unwatched")}
          />
        )}

        <div className="ht-poster__hover">

          <Play size={26} />
        </div>
      </div>

      <div className="ht-poster__meta">
        <span className="ht-poster__title">
          {title}
        </span>

        <span className="ht-poster__year">
          {movie?.year || "—"}
        </span>
      </div>
    </button>
  );
}