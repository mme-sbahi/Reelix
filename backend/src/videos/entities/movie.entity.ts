import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Comment } from './comment.entity';

@Entity('movies')
export class Movie {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'tmdb_id', type: 'integer', unique: true, nullable: true })
  tmdbId?: number | null;

  @Column({ name: 'title', type: 'varchar' })
  title: string;

  @Column({ name: 'original_title', type: 'varchar', nullable: true })
  originalTitle?: string | null;

  @Column({ name: 'overview', type: 'text', nullable: true })
  overview?: string | null;

  @Column({ name: 'poster_path', type: 'varchar', nullable: true })
  posterPath?: string | null;

  @Column({ name: 'backdrop_path', type: 'varchar', nullable: true })
  backdropPath?: string | null;

  @Column({ name: 'release_date', type: 'varchar', nullable: true })
  releaseDate?: string | null;

  @Column({ name: 'release_year', type: 'integer', nullable: true })
  releaseYear?: number | null;

  @Column({ name: 'runtime_minutes', type: 'integer', nullable: true })
  runtimeMinutes?: number | null;

  @Column({ name: 'vote_average', type: 'decimal', precision: 4, scale: 1, nullable: true })
  voteAverage?: string | null;

  @Column({ name: 'genres', type: 'jsonb', default: () => "'[]'::jsonb" })
  genres: string[];

  @Column({ name: 'cast', type: 'jsonb', default: () => "'[]'::jsonb" })
  cast: Array<{ name: string; character?: string | null; job?: string | null }>;

  @Column({ name: 'archive_identifier', type: 'varchar', nullable: true })
  archiveIdentifier?: string | null;

  @Column({ name: 'archive_stream_url', type: 'varchar', nullable: true })
  archiveStreamUrl?: string | null;

  @Column({ name: 'archive_page_url', type: 'varchar', nullable: true })
  archivePageUrl?: string | null;

  @Column({ name: 'magnet_url', type: 'text', nullable: true })
  magnetUrl?: string | null;

  @Column({ name: 'yts_torrent_hash', type: 'varchar', nullable: true })
  ytsTorrentHash?: string | null;

  @Column({ name: 'local_file_path', type: 'varchar', nullable: true })
  localFilePath?: string | null;

  @Column({ name: 'download_status', type: 'varchar', default: 'none' })
  downloadStatus: 'none' | 'downloading' | 'completed';

  @Column({ name: 'last_watched_at', type: 'timestamp', nullable: true })
  lastWatchedAt?: Date | null;

  @Column({ name: 'subtitle_urls', type: 'jsonb', default: () => "'[]'::jsonb" })
  subtitleUrls: Array<{ lang: string; label: string; url: string }>;

  @OneToMany(() => Comment, (comment) => comment.movie)
  comments: Comment[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}