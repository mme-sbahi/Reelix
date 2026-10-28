import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { existsSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { Movie } from './entities/movie.entity';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
  ) {}

  /**
   * Cron job running daily at midnight.
   * Subject Rule: "However, if a movie is unwatched for a month, it will be erased."
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, { name: 'cleanup-unwatched-movies' })
  async cleanupUnwatchedMovies() {
    this.logger.log('Starting 30-day unwatched movies cleanup job...');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const oldMovies = await this.moviesRepository.find({
      where: [
        { lastWatchedAt: LessThan(thirtyDaysAgo) },
      ],
    });

    let cleanedCount = 0;

    for (const movie of oldMovies) {
      if (movie.localFilePath && existsSync(movie.localFilePath)) {
        try {
          unlinkSync(movie.localFilePath);
          this.logger.log(`Deleted unwatched file for movie "${movie.title}": ${movie.localFilePath}`);
        } catch (err) {
          this.logger.error(`Failed to delete file for movie "${movie.title}": ${err}`);
        }
      }

      // Cleanup subtitle folder if exists
      const subDir = join(process.cwd(), 'media', 'subtitles', movie.id);
      if (existsSync(subDir)) {
        try {
          rmSync(subDir, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      }

      movie.localFilePath = null;
      movie.downloadStatus = 'none';
      await this.moviesRepository.save(movie);
      cleanedCount++;
    }

    this.logger.log(`Cleanup job finished. Erased ${cleanedCount} unwatched movies.`);
  }
}
