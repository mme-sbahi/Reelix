import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { OpenSubtitlesService } from './opensubtitles.service';

type SubtitleTrack = {
  lang: string;
  label: string;
  url: string;
};

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  ar: 'العربية',
  it: 'Italiano',
  pt: 'Português',
  ru: 'Русский',
  zh: '中文',
  ja: '日本語',
};

@Injectable()
export class SubtitlesService {
  private readonly logger = new Logger(SubtitlesService.name);
  private readonly mediaSubtitlesDir = join(process.cwd(), 'media', 'subtitles');

  constructor(private readonly openSubtitlesService: OpenSubtitlesService) {
    if (!existsSync(this.mediaSubtitlesDir)) {
      mkdirSync(this.mediaSubtitlesDir, { recursive: true });
    }
  }

  /**
   * Get subtitle tracks for a movie.
   * Tries to download real subtitles from OpenSubtitles by TMDB ID.
   * Falls back to dummy VTT if no API key or subtitles not found.
   */
  async getSubtitlesForMovie(
    movieId: string,
    title: string,
    apiBase = 'http://localhost:3001',
    tmdbId?: number | null,
    preferredLang?: string | null,
  ): Promise<SubtitleTrack[]> {
    const movieSubDir = join(this.mediaSubtitlesDir, movieId);
    if (!existsSync(movieSubDir)) {
      mkdirSync(movieSubDir, { recursive: true });
    }

    // Try to fetch real subtitles from OpenSubtitles for en, fr, and user's preferred language
    const languagesToFetch = Array.from(
      new Set(['en', 'fr', (preferredLang || '').toLowerCase().trim()].filter(Boolean)),
    );

    for (const lang of languagesToFetch) {
      const vttFile = join(movieSubDir, `${lang}.vtt`);
      if (!existsSync(vttFile) && tmdbId) {
        this.logger.log(`Fetching real ${lang} subtitles for "${title}" (tmdbId=${tmdbId}) from OpenSubtitles...`);
        try {
          const vttContent = await this.openSubtitlesService.fetchVttSubtitle(tmdbId, lang);
          if (vttContent) {
            writeFileSync(vttFile, vttContent, 'utf8');
            this.logger.log(`Saved real ${lang}.vtt for "${title}"`);
          }
        } catch (err) {
          this.logger.warn(`Failed to fetch ${lang} subtitle for "${title}": ${err}`);
        }
      }
    }


    // List all VTT files on disk (real + fallback)
    const files = readdirSync(movieSubDir);
    const vttFiles = files.filter((f) => f.endsWith('.vtt'));

    return vttFiles.map((filename) => {
      const lang = filename.replace(/\.vtt$/, '').toLowerCase();
      const label = LANG_LABELS[lang] ?? lang.toUpperCase();
      return {
        lang,
        label,
        url: `${apiBase}/movies/${movieId}/subtitles/${lang}`,
      };
    });
  }

  /**
   * Save a subtitle WebVTT content file for a movie
   */
  saveSubtitleFile(movieId: string, lang: string, vttContent: string) {
    const movieSubDir = join(this.mediaSubtitlesDir, movieId);
    if (!existsSync(movieSubDir)) {
      mkdirSync(movieSubDir, { recursive: true });
    }
    const filePath = join(movieSubDir, `${lang.toLowerCase()}.vtt`);
    writeFileSync(filePath, vttContent, 'utf8');
  }

  getSubtitleContent(movieId: string, lang: string): string {
    const filePath = join(this.mediaSubtitlesDir, movieId, `${lang}.vtt`);
    if (!existsSync(filePath)) {
      throw new NotFoundException(`Subtitle for language ${lang} not found`);
    }
    return readFileSync(filePath, 'utf8');
  }
}
