import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Comment } from './entities/comment.entity';
import { Movie } from './entities/movie.entity';
import { WatchedMovie } from './entities/watched-movie.entity';
import { YtsService } from './yts.service';

type TmdbMovieSummary = {
  id: number;
  title: string;
  original_title?: string;
  overview?: string;
  poster_path?: string;
  backdrop_path?: string;
  release_date?: string;
  vote_average?: number;
};

type TmdbMovieDetails = TmdbMovieSummary & {
  runtime?: number;
  genres?: Array<{ id: number; name: string }>;
  credits?: {
    cast?: Array<{ name: string; character?: string }>;
    crew?: Array<{ name: string; job?: string }>;
  };
};

import { SubtitlesService } from './subtitles.service';

@Injectable()
export class MoviesService implements OnModuleInit {
  private readonly tmdbBaseUrl: string;
  private readonly tmdbApiKey: string;
  private readonly tmdbImageBaseUrl: string;
  private readonly archiveBaseUrl: string;

  async onModuleInit() {
    // Purge old cached magnets so fresh clean non-HC releases are resolved
    try {
      await this.moviesRepository.update({}, { magnetUrl: undefined });
    } catch {
      /* ignore init error */
    }
  }

  constructor(
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    @InjectRepository(WatchedMovie)
    private readonly watchedMoviesRepository: Repository<WatchedMovie>,
    private readonly ytsService: YtsService,
    private readonly subtitlesService: SubtitlesService,
    configService: ConfigService,
  ) {
    this.tmdbBaseUrl =
      configService.get<string>('TMDB_BASE_URL') ?? 'https://api.themoviedb.org/3';
    this.tmdbApiKey = configService.get<string>('TMDB_API_KEY') ?? '';
    this.tmdbImageBaseUrl =
      configService.get<string>('TMDB_IMAGE_BASE_URL') ?? 'https://image.tmdb.org/t/p/w500';
    this.archiveBaseUrl =
      configService.get<string>('ARCHIVE_ORG_BASE_URL') ?? 'https://archive.org';
  }

  async getFrontPageMovies(query?: string, page = 1, userId?: string) {
    const tmdbMovies = query
      ? await this.searchTmdbMovies(query, page)
      : await this.fetchTmdbPopularMovies(page);

    const savedMovies = await Promise.all(
      tmdbMovies.map((movie) => this.upsertFromTmdbSummary(movie)),
    );

    const watchedSet = new Set<string>();
    if (userId) {
      const watched = await this.watchedMoviesRepository.find({
        where: { userId },
        select: ['movieId'],
      });
      for (const item of watched) {
        watchedSet.add(item.movieId);
      }
    }

    return savedMovies
      .map((movie) => this.toListItem(movie, watchedSet.has(movie.id)))
      .sort((left, right) => left.title.localeCompare(right.title));
  }

  async getMovieDetails(
    movieId: string,
    apiBase = 'http://localhost:3001',
    userId?: string,
    preferredLang?: string,
  ) {
    const movie = await this.moviesRepository.findOne({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    const commentsCount = await this.commentsRepository.count({
      where: { movie: { id: movieId } },
    });

    if (movie.archiveStreamUrl) {
      try {
        const check = await fetch(movie.archiveStreamUrl, { method: 'HEAD' });
        if (!check.ok) {
          movie.archiveStreamUrl = undefined;
          movie.archiveIdentifier = undefined;
          movie.archivePageUrl = undefined;
          await this.moviesRepository.save(movie);
        }
      } catch {
        movie.archiveStreamUrl = undefined;
        movie.archiveIdentifier = undefined;
        movie.archivePageUrl = undefined;
        await this.moviesRepository.save(movie);
      }
    }

    // Resolve and cache a stream source (YTS magnet preferred)
    let hasStream = !!movie.magnetUrl || !!movie.archiveStreamUrl;//Does this movie have either a torrent magnet URL or an archive video URL?
    if (!hasStream) {
      try {
        await this.resolveStream(movie);
        hasStream = !!movie.magnetUrl || !!movie.archiveStreamUrl; //Does this movie have either a torrent magnet URL or an archive video URL?
      } catch {
        hasStream = false;
      }
    }

    const streamUrl = hasStream ? `${apiBase}/movies/${movieId}/stream` : null;

    // Fetch subtitle tracks for player (taking preferred language into account)
    const subtitles = await this.subtitlesService.getSubtitlesForMovie(
      movieId,
      movie.title,
      apiBase,
      movie.tmdbId,
      preferredLang,
    );

    let watched = false;
    if (userId) {
      try {
        const existing = await this.watchedMoviesRepository.findOne({
          where: { userId, movieId },
        });
        if (!existing) {
          await this.watchedMoviesRepository.save(
            this.watchedMoviesRepository.create({
              userId,
              movieId,
              watchedAt: new Date(),
            }),
          );
        } else {
          existing.watchedAt = new Date();
          await this.watchedMoviesRepository.save(existing);
        }
        watched = true;
      } catch {
        /* ignore */
      }
    }

    return {
      ...this.toDetailItem(movie),
      commentsCount,
      streamUrl,
      subtitles,
      watched,
    };
  }

  async markAsWatched(movieId: string, userId: string) {
    const movie = await this.moviesRepository.findOne({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }
    const existing = await this.watchedMoviesRepository.findOne({ where: { userId, movieId } });
    if (!existing) {
      await this.watchedMoviesRepository.save(
        this.watchedMoviesRepository.create({ userId, movieId, watchedAt: new Date() }),
      );
    } else {
      existing.watchedAt = new Date();
      await this.watchedMoviesRepository.save(existing);
    }
    return { success: true, movieId, watched: true };
  }


  async getMovieForStream(movieId: string, userId?: string) {
    const movie = await this.moviesRepository.findOne({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    if (movie.archiveStreamUrl) {
      try {
        const check = await fetch(movie.archiveStreamUrl, { method: 'HEAD' });
        if (!check.ok) {
          movie.archiveStreamUrl = undefined;
          movie.archiveIdentifier = undefined;
          movie.archivePageUrl = undefined;
          await this.moviesRepository.save(movie);
        }
      } catch {
        movie.archiveStreamUrl = undefined;
        movie.archiveIdentifier = undefined;
        movie.archivePageUrl = undefined;
        await this.moviesRepository.save(movie);
      }
    }

    if (!movie.magnetUrl && !movie.archiveStreamUrl) {
      await this.resolveStream(movie);
    }

    // Update last watched timestamp for 30-day retention cleanup rule
    movie.lastWatchedAt = new Date();
    await this.moviesRepository.save(movie);

    // Record watch history for this specific user
    if (userId) {
      try {
        const existing = await this.watchedMoviesRepository.findOne({
          where: { userId, movieId },
        });
        if (!existing) {
          await this.watchedMoviesRepository.save(
            this.watchedMoviesRepository.create({
              userId,
              movieId,
              watchedAt: new Date(),
            }),
          );
        } else {
          existing.watchedAt = new Date();
          await this.watchedMoviesRepository.save(existing);
        }
      } catch {
        /* ignore concurrency races */
      }
    }

    return { movie, magnetUrl: movie.magnetUrl ?? null, archiveStreamUrl: movie.archiveStreamUrl ?? null };
  }

  getMovieSubtitleContent(movieId: string, lang: string): string {
    return this.subtitlesService.getSubtitleContent(movieId, lang);
  }

  async getMovieComments(movieId: string) {
    const movie = await this.moviesRepository.findOne({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    const comments = await this.commentsRepository.find({
      where: { movie: { id: movieId } },
      relations: { author: true, movie: true },
      order: { createdAt: 'DESC' },
    });

    return comments.map((comment) => ({
      id: comment.id,
      movieId: comment.movie?.id,
      authorId: comment.author?.id,
      authorUsername: comment.author?.username || comment.author?.fullName,
      authorAvatarUrl: comment.author?.avatarUrl,
      date: comment.createdAt,
      content: comment.content,
    }));
  }

  async ensureMovieFromTmdb(tmdbId: number) {
    const existing = await this.moviesRepository.findOne({ where: { tmdbId } });
    if (existing) {
      return existing;
    }

    const details = await this.fetchTmdbMovieDetails(tmdbId);
    return this.upsertFromTmdbDetails(details);
  }

  private async fetchTmdbPopularMovies(page: number) {
    const response = await fetch(
      `${this.tmdbBaseUrl}/movie/popular?api_key=${this.tmdbApiKey}&page=${page}`,
    );

    if (!response.ok) {
      throw new NotFoundException('Failed to fetch TMDB popular movies');
    }

    const payload = (await response.json()) as { results?: TmdbMovieSummary[] };
    return payload.results ?? [];
  }

  private async searchTmdbMovies(query: string, page: number) {
    const response = await fetch(
      `${this.tmdbBaseUrl}/search/movie?api_key=${this.tmdbApiKey}&query=${encodeURIComponent(query)}&page=${page}`,
    );

    if (!response.ok) {
      throw new NotFoundException('Failed to search TMDB movies');
    }

    const payload = (await response.json()) as { results?: TmdbMovieSummary[] };
    return payload.results ?? [];
  }

  private async fetchTmdbMovieDetails(tmdbId: number) {
    const response = await fetch(
      `${this.tmdbBaseUrl}/movie/${tmdbId}?api_key=${this.tmdbApiKey}&append_to_response=credits`,
    );

    if (!response.ok) {
      throw new NotFoundException('TMDB movie not found');
    }

    return (await response.json()) as TmdbMovieDetails;
  }

  private async upsertFromTmdbSummary(summary: TmdbMovieSummary) {
    const existing = await this.moviesRepository.findOne({ where: { tmdbId: summary.id } });
    const movie = existing ?? this.moviesRepository.create({ tmdbId: summary.id, title: summary.title, genres: [], cast: [], subtitleUrls: [] });

    movie.title = summary.title;
    movie.originalTitle = summary.original_title ?? summary.title;
    movie.overview = summary.overview ?? null;
    movie.posterPath = summary.poster_path ?? null;
    movie.backdropPath = summary.backdrop_path ?? null;
    movie.releaseDate = summary.release_date ?? null;
    movie.releaseYear = summary.release_date ? Number(summary.release_date.slice(0, 4)) : null;
    movie.voteAverage = summary.vote_average?.toFixed(1) ?? null;

    return this.moviesRepository.save(movie);
  }

  private async upsertFromTmdbDetails(details: TmdbMovieDetails) {
    const movie = await this.upsertFromTmdbSummary(details);
    movie.runtimeMinutes = details.runtime ?? null;
    movie.genres = details.genres?.map((genre) => genre.name) ?? [];
    movie.cast = this.pickCast(details);
    return this.moviesRepository.save(movie);
  }

  private pickCast(details: TmdbMovieDetails) {
    const crew = details.credits?.crew
      ?.filter((member) => ['Director', 'Producer', 'Writer'].includes(member.job ?? ''))
      .slice(0, 5)
      .map((member) => ({
        name: member.name,
        character: null,
        job: member.job ?? null,
      })) ?? [];

    const cast = details.credits?.cast?.slice(0, 8).map((member) => ({
      name: member.name,
      character: member.character ?? null,
      job: 'cast',
    })) ?? [];

    return [...crew, ...cast];
  }

  private toListItem(movie: Movie, watched = false) {
    return {
      id: movie.id,
      title: movie.title,
      year: movie.releaseYear,
      rating: movie.voteAverage ? Number(movie.voteAverage) : null,
      posterUrl: movie.posterPath ? `${this.tmdbImageBaseUrl}${movie.posterPath}` : null,
      watched,
    };
  }


  private toDetailItem(movie: Movie) {
    return {
      id: movie.id,
      title: movie.title,
      originalTitle: movie.originalTitle,
      overview: movie.overview,
      year: movie.releaseYear,
      runtime: movie.runtimeMinutes,
      rating: movie.voteAverage ? Number(movie.voteAverage) : null,
      posterUrl: movie.posterPath ? `${this.tmdbImageBaseUrl}${movie.posterPath}` : null,
      backdropUrl: movie.backdropPath ? `${this.tmdbImageBaseUrl}${movie.backdropPath}` : null,
      genres: movie.genres,
      cast: movie.cast,
      subtitles: movie.subtitleUrls,
      archiveIdentifier: movie.archiveIdentifier,
    };
  }

  private async resolveStream(movie: Movie): Promise<void> {
    // 1. Try YTS
    const yts = await this.ytsService.findMagnet(movie.title, movie.releaseYear);
    if (yts) {
      movie.magnetUrl = yts.magnetUrl;
      movie.ytsTorrentHash = yts.hash;
      await this.moviesRepository.save(movie);
      return;
    }

    // 2. Fall back to archive.org
    try {
      await this.resolveArchiveStream(movie);
    } catch {
      // No stream source available
    }
  }

  private async resolveArchiveStream(movie: Movie) {
    if (movie.archiveStreamUrl) {
      try {
        const check = await fetch(movie.archiveStreamUrl, { method: 'HEAD' });
        if (check.ok) return movie.archiveStreamUrl;
      } catch {
        /* invalid cached URL */
      }
      movie.archiveStreamUrl = undefined;
      movie.archiveIdentifier = undefined;
      movie.archivePageUrl = undefined;
      await this.moviesRepository.save(movie);
    }

    const titleQuery = `title:("${movie.title}")`;
    const searchUrl = `${this.archiveBaseUrl}/advancedsearch.php?q=${encodeURIComponent(`${titleQuery} AND mediatype:(movies)`)}&fl[]=identifier,title,year&rows=10&page=1&output=json`;
    const response = await fetch(searchUrl);

    if (!response.ok) {
      throw new NotFoundException('No legal stream source found');
    }

    const payload = (await response.json()) as { response?: { docs?: Array<{ identifier: string }> } };
    const docs = payload.response?.docs ?? [];

    for (const doc of docs) {
      const identifier = doc.identifier;
      if (!identifier) continue;

      try {
        const metadataResponse = await fetch(`${this.archiveBaseUrl}/metadata/${identifier}`);
        if (!metadataResponse.ok) continue;

        const metadata = (await metadataResponse.json()) as {
          files?: Array<{ name?: string; format?: string }>;
        };

        const streamFile = metadata.files?.find((file) => {
          const name = file.name ?? '';
          const format = `${file.format ?? ''}`.toLowerCase();
          return (
            name.endsWith('.mp4') ||
            name.endsWith('.webm') ||
            name.endsWith('.ogv') ||
            format.includes('mpeg4') ||
            format.includes('h.264') ||
            format.includes('webm')
          );
        });

        if (!streamFile?.name) continue;

        const streamUrl = `${this.archiveBaseUrl}/download/${identifier}/${encodeURIComponent(streamFile.name)}`;
        const testRes = await fetch(streamUrl, { method: 'HEAD' });
        if (!testRes.ok) continue;

        movie.archiveIdentifier = identifier;
        movie.archiveStreamUrl = streamUrl;
        movie.archivePageUrl = `${this.archiveBaseUrl}/details/${identifier}`;
        await this.moviesRepository.save(movie);
        return streamUrl;
      } catch {
        continue;
      }
    }

    throw new NotFoundException('No legal stream source found');
  }
}