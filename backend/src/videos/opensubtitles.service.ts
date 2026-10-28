import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OpenSubtitlesService {
  private readonly logger = new Logger(OpenSubtitlesService.name);
  private readonly apiBase = 'https://api.opensubtitles.com/api/v1';
  private readonly apiKey: string;
  private readonly appName = 'Hypertube v1.0';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('OPENSUBTITLES_API_KEY') ?? '';
  }

  /**
   * Search OpenSubtitles for a subtitle file by TMDB ID and language.
   * Returns the file_id of the best subtitle match, or null if not found.
   */
  async searchSubtitle(tmdbId: number, lang: string): Promise<{ fileId: number; fileName: string } | null> {
    if (!this.apiKey) {
      this.logger.warn('OPENSUBTITLES_API_KEY not configured — skipping real subtitle fetch');
      return null;
    }

    try {
      const url = `${this.apiBase}/subtitles?tmdb_id=${tmdbId}&languages=${lang}&type=movie&order_by=download_count`;
      const response = await fetch(url, {
        headers: {
          'Api-Key': this.apiKey,
          'User-Agent': this.appName,
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        this.logger.warn(`OpenSubtitles search failed for tmdbId=${tmdbId} lang=${lang}: ${response.status}`);
        return null;
      }

      const data = await response.json() as {
        data?: Array<{
          attributes?: {
            files?: Array<{ file_id: number; file_name: string }>;
          };
        }>;
      };

      const firstResult = data.data?.[0];
      const firstFile = firstResult?.attributes?.files?.[0];

      if (!firstFile) {
        this.logger.log(`No subtitles found for tmdbId=${tmdbId} lang=${lang}`);
        return null;
      }

      return { fileId: firstFile.file_id, fileName: firstFile.file_name };
    } catch (err) {
      this.logger.error(`OpenSubtitles search error: ${err}`);
      return null;
    }
  }

  /**
   * Request a download URL from OpenSubtitles for a given file_id.
   * Returns the download URL or null.
   */
  async getDownloadUrl(fileId: number): Promise<string | null> {
    if (!this.apiKey) return null;

    try {
      const response = await fetch(`${this.apiBase}/download`, {
        method: 'POST',
        headers: {
          'Api-Key': this.apiKey,
          'User-Agent': this.appName,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({ file_id: fileId }),
      });

      if (!response.ok) {
        this.logger.warn(`OpenSubtitles download request failed for fileId=${fileId}: ${response.status}`);
        return null;
      }

      const data = await response.json() as { link?: string };
      return data.link ?? null;
    } catch (err) {
      this.logger.error(`OpenSubtitles download error: ${err}`);
      return null;
    }
  }

  /**
   * Download SRT content from a URL and convert to WebVTT.
   */
  async downloadAndConvertToVtt(downloadUrl: string): Promise<string | null> {
    try {
      const response = await fetch(downloadUrl);
      if (!response.ok) return null;

      const srtContent = await response.text();
      return this.srtToVtt(srtContent);
    } catch (err) {
      this.logger.error(`Failed to download subtitle file: ${err}`);
      return null;
    }
  }

  /**
   * Full flow: search, get download URL, download SRT, convert to VTT.
   * Returns the VTT content string, or null if any step fails.
   */
  async fetchVttSubtitle(tmdbId: number, lang: string): Promise<string | null> {
    const found = await this.searchSubtitle(tmdbId, lang);
    if (!found) return null;

    const downloadUrl = await this.getDownloadUrl(found.fileId);
    if (!downloadUrl) return null;

    return this.downloadAndConvertToVtt(downloadUrl);
  }

  /**
   * Convert SRT format to WebVTT format.
   */
  private srtToVtt(srt: string): string {
    let vtt = 'WEBVTT\n\n';

    // Normalize line endings
    const normalized = srt.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    // Split on double newlines (subtitle blocks)
    const blocks = normalized.split(/\n\n+/);

    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (lines.length < 2) continue;

      let startIdx = 0;
      // Skip the numeric index line
      if (/^\d+$/.test(lines[0].trim())) {
        startIdx = 1;
      }

      if (startIdx >= lines.length) continue;

      const timeLine = lines[startIdx];
      // Convert SRT timestamps (00:00:00,000 --> 00:00:00,000) to VTT (00:00:00.000 --> 00:00:00.000)
      if (!timeLine.includes('-->')) continue;

      const vttTimeLine = timeLine.replace(/,/g, '.');
      const textLines = lines.slice(startIdx + 1).join('\n');

      if (!textLines.trim()) continue;

      vtt += `${vttTimeLine}\n${textLines}\n\n`;
    }

    return vtt;
  }
}
