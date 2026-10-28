import { Injectable } from '@nestjs/common';
import { existsSync, statSync, createReadStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';
import { Request, Response } from 'express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const torrentStream = require('torrent-stream');
import ffmpeg from 'fluent-ffmpeg';

const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.avi', '.mov', '.webm', '.m4v'];
const TORRENT_TIMEOUT_MS = 30_000;

@Injectable()
export class StreamService {
  // ──────────────────────────────────────────────────────────────────────────
  // Public entry points
  // ──────────────────────────────────────────────────────────────────────────

  async streamSource(sourceUrl: string, request: Request, response: Response) {
    if (sourceUrl.startsWith('http://') || sourceUrl.startsWith('https://')) {
      return this.streamRemote(sourceUrl, request, response);
    }
    return this.streamLocal(sourceUrl, request, response);
  }

  async streamTorrent(magnetUrl: string, request: Request, response: Response) {
    return new Promise<void>((resolve, reject) => {
      // Once the Promise settles (or headers are sent) we must never call
      // reject again, otherwise NestJS's exception filter tries to write JSON
      // on an already-in-flight response → ERR_HTTP_HEADERS_SENT.
      let settled = false;

      const safeResolve = () => {
        if (settled) return;
        settled = true;
        resolve();
      };

      const safeReject = (err: unknown) => {
        if (settled) return;
        settled = true;
        // If the response stream is already open the client owns the
        // connection; attempting to set headers would crash. Swallow silently.
        if (response.headersSent) {
          resolve();
        } else {
          reject(err);
        }
      };

      const engine = torrentStream(magnetUrl, {
        connections: 50,
        uploads: 0,
        verify: false,
        dht: true,
        tracker: true,
      });

      const destroyEngine = () => {
        try { engine.destroy(() => undefined); } catch { /* ignore */ }
      };

      const timer = setTimeout(() => {
        destroyEngine();
        if (!response.headersSent) {
          response.status(504).json({ message: 'Torrent timed out – no peers found' });
        }
        safeResolve();
      }, TORRENT_TIMEOUT_MS);

      engine.on('ready', () => {
        const videoFiles = (engine.files as TorrentFile[]).filter((f) =>
          VIDEO_EXTENSIONS.some((ext) => f.name.toLowerCase().endsWith(ext)),
        );

        if (videoFiles.length === 0) {
          clearTimeout(timer);
          destroyEngine();
          if (!response.headersSent) {
            response.status(404).json({ message: 'No video file found in torrent' });
          }
          return safeResolve();
        }

        const file = videoFiles.reduce<TorrentFile>(
          (biggest, f) => (f.length > biggest.length ? f : biggest),
          videoFiles[0],
        );

        clearTimeout(timer);

        this.pipeFileToResponse(file, request, response)
          .then(() => {
            destroyEngine();
            safeResolve();
          })
          .catch((err) => {
            destroyEngine();
            safeReject(err);
          });
      });

      engine.on('error', (err: Error) => {
        clearTimeout(timer);
        destroyEngine();
        if (!response.headersSent) {
          response.status(500).json({ message: 'Torrent engine error', detail: err.message });
        }
        safeResolve();
      });
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private helpers
  // ──────────────────────────────────────────────────────────────────────────

  private isNativeBrowserFormat(filename: string): boolean {
    const ext = filename.split('.').pop()?.toLowerCase();
    return ext === 'mp4' || ext === 'webm';
  }

  /**
   * True when the given pipeline/stream error is just the client seeking or
   * closing the connection mid-transfer. These are expected during normal
   * video playback (range requests, scrubbing, tab close) and must never be
   * rethrown once headers may already have been sent — otherwise Nest's
   * exception filter tries to write a JSON error on a response that's already
   * in flight, crashing with ERR_HTTP_HEADERS_SENT.
   */
  private isAbortError(err: unknown): boolean {
    const code = (err as NodeJS.ErrnoException)?.code ?? '';
    const msg = (err as Error)?.message ?? '';
    return (
      code === 'ERR_STREAM_PREMATURE_CLOSE' ||
      code === 'ECONNRESET' ||
      code === 'EPIPE' ||
      msg.includes('aborted') ||
      msg.includes('premature close')
    );
  }

  private async pipeFileToResponse(file: TorrentFile, request: Request, response: Response): Promise<void> {
    if (!this.isNativeBrowserFormat(file.name)) {
      return this.transcodeStreamToMp4(file.createReadStream(), response);
    }

    const totalSize = file.length;
    const rangeHeader = request.headers.range;

    let stream: NodeJS.ReadableStream;

    if (!rangeHeader) {
      response.status(200);
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('Content-Length', totalSize);
      response.setHeader('Content-Type', this.mimeType(file.name));
      stream = file.createReadStream();
    } else {
      const { start, end } = this.parseRange(rangeHeader, totalSize);
      const chunkSize = end - start + 1;

      response.status(206);
      response.setHeader('Content-Range', `bytes ${start}-${end}/${totalSize}`);
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('Content-Length', chunkSize);
      response.setHeader('Content-Type', this.mimeType(file.name));
      stream = file.createReadStream({ start, end });
    }

    try {
      await pipeline(stream, response);
    } catch (err: unknown) {
      if (!this.isAbortError(err)) throw err;
    }
  }

  private transcodeStreamToMp4(inputStream: Readable, response: Response): Promise<void> {
    return new Promise<void>((resolve) => {
      if (!response.headersSent) {
        response.status(200);
        response.setHeader('Content-Type', 'video/mp4');
      }

      const command = ffmpeg(inputStream)
        .videoCodec('libx264')
        .audioCodec('aac')
        .format('mp4')
        .outputOptions([
          '-preset ultrafast',
          '-tune zerolatency',
          '-movflags frag_keyframe+empty_moov+default_base_moof',
        ])
        .on('error', () => {
          resolve();
        })
        .on('end', () => {
          resolve();
        });

      command.pipe(response, { end: true });

      response.on('close', () => {
        try {
          command.kill('SIGKILL');
        } catch {
          /* ignore */
        }
      });
    });
  }

  private parseRange(rangeHeader: string, totalSize: number) {
    const [rawStart, rawEnd] = rangeHeader.replace(/bytes=/, '').split('-');
    const start = Number.parseInt(rawStart, 10);
    const end = rawEnd ? Number.parseInt(rawEnd, 10) : Math.min(start + 1_000_000, totalSize - 1);
    return { start, end: Math.min(end, totalSize - 1) };
  }

  private mimeType(filename: string): string {
    const ext = filename.split('.').pop()?.toLowerCase();
    const types: Record<string, string> = {
      mp4: 'video/mp4',
      mkv: 'video/x-matroska',
      webm: 'video/webm',
      avi: 'video/x-msvideo',
      mov: 'video/quicktime',
      m4v: 'video/mp4',
    };
    return types[ext ?? ''] ?? 'application/octet-stream';
  }

  private async streamRemote(sourceUrl: string, request: Request, response: Response) {
    const isNative = this.isNativeBrowserFormat(sourceUrl);

    const headers: Record<string, string> = {};
    if (isNative && request.headers.range) {
      headers.Range = request.headers.range;
    }

    let remoteResponse: globalThis.Response;
    try {
      remoteResponse = await fetch(sourceUrl, { headers });
    } catch (err) {
      if (!response.headersSent) {
        response.status(502).json({ message: 'Failed to reach remote source' });
      }
      return;
    }

    if (!remoteResponse.ok) {
      if (!response.headersSent) {
        response.status(404).json({ message: 'Remote video stream is not available' });
      }
      return;
    }

    if (!remoteResponse.body) {
      response.end();
      return;
    }

    const bodyStream = Readable.fromWeb(remoteResponse.body as never);

    if (!isNative) {
      return this.transcodeStreamToMp4(bodyStream, response);
    }

    response.status(remoteResponse.status);
    remoteResponse.headers.forEach((value, key) => {
      response.setHeader(key, value);
    });

    try {
      await pipeline(bodyStream, response);
    } catch (err: unknown) {
      if (!this.isAbortError(err)) throw err;
    }
  }

  private async streamLocal(sourcePath: string, request: Request, response: Response) {
    if (!existsSync(sourcePath)) {
      response.status(404).json({ message: 'Video file not found' });
      return;
    }

    if (!this.isNativeBrowserFormat(sourcePath)) {
      return this.transcodeStreamToMp4(createReadStream(sourcePath), response);
    }

    const fileSize = statSync(sourcePath).size;
    const range = request.headers.range;

    let stream: NodeJS.ReadableStream;

    if (!range) {
      response.status(200);
      response.setHeader('Content-Length', fileSize);
      response.setHeader('Accept-Ranges', 'bytes');
      stream = createReadStream(sourcePath);
    } else {
      const [rangeStart, rangeEnd] = range.replace(/bytes=/, '').split('-');
      const start = Number.parseInt(rangeStart, 10);
      const end = rangeEnd ? Number.parseInt(rangeEnd, 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      response.status(206);
      response.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      response.setHeader('Accept-Ranges', 'bytes');
      response.setHeader('Content-Length', chunkSize);
      stream = createReadStream(sourcePath, { start, end });
    }

    try {
      await pipeline(stream, response);
    } catch (err: unknown) {
      if (!this.isAbortError(err)) throw err;
    }
  }
}

// Minimal local type to avoid importing the torrent-stream typings
interface TorrentFile {
  name: string;
  length: number;
  createReadStream(opts?: { start?: number; end?: number }): Readable;
}