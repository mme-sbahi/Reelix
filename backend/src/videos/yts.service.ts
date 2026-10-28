import { Injectable } from '@nestjs/common';

type YtsMovie = {
    id: number;
    title: string;
    year: number;
    torrents?: Array<{
        hash: string;
        quality: string;
        type: string;
        url: string;
    }>;
};

const QUALITY_PRIORITY = ['1080p', '720p', '480p', '2160p'];
const TYPE_PRIORITY = ['bluray', 'web', 'hdrip', 'cam'];

const TRACKERS = [
    'udp://open.demonii.com:1337/announce',
    'udp://tracker.openbittorrent.com:80',
    'udp://tracker.coppersurfer.tk:6969',
    'udp://glotorrents.pw:6969/announce',
    'udp://tracker.opentrackr.org:1337/announce',
    'udp://torrent.gresille.org:80/announce',
    'udp://p4p.arenabg.com:1337',
    'udp://tracker.leechers-paradise.org:6969',
].join('&tr=');

@Injectable()
export class YtsService {
    private readonly baseUrl = 'https://yts.mx/api/v2';

    async findMagnet(title: string, year?: number | null): Promise<{ magnetUrl: string; hash: string } | null> {
        let result = await this.queryYts(title, year);
        if (!result && year) {
            result = await this.queryYts(title, null);
        }
        return result;
    }

    private async queryYts(title: string, year?: number | null): Promise<{ magnetUrl: string; hash: string } | null> {
        const query = year ? `${title} ${year}` : title;

        try {
            const url = `${this.baseUrl}/list_movies.json?query_term=${encodeURIComponent(query)}&limit=5`;
            const response = await fetch(url);
            if (!response.ok) return null;

            const payload = (await response.json()) as {
                data?: { movies?: YtsMovie[] };
            };

            const movies = payload.data?.movies ?? [];
            if (movies.length === 0) return null;

            const movie = movies.find((m) => !year || m.year === year) ?? movies[0];
            const torrents = movie.torrents ?? [];
            if (torrents.length === 0) return null;

            const best = this.pickBestTorrent(torrents);
            if (!best) return null;

            const magnetUrl = this.buildMagnet(best.hash, movie.title);
            return { magnetUrl, hash: best.hash };
        } catch {
            return null;
        }
    }

    private pickBestTorrent(torrents: YtsMovie['torrents']): { hash: string; quality: string; type: string } | null {
        if (!torrents || torrents.length === 0) return null;

        // Filter out hardcoded (HC), CAM, or TS releases
        const cleanTorrents = torrents.filter((t) => {
            const str = `${t.quality} ${t.type}`.toLowerCase();
            return !str.includes('hc') && !str.includes('cam') && !str.includes('ts') && !str.includes('hardcoded');
        });

        const pool = cleanTorrents.length > 0 ? cleanTorrents : torrents;

        const sorted = [...pool].sort((a, b) => {
            const qA = QUALITY_PRIORITY.indexOf(a.quality);
            const qB = QUALITY_PRIORITY.indexOf(b.quality);
            const qualityDiff = (qA === -1 ? 99 : qA) - (qB === -1 ? 99 : qB);
            if (qualityDiff !== 0) return qualityDiff;

            const tA = TYPE_PRIORITY.indexOf(a.type.toLowerCase());
            const tB = TYPE_PRIORITY.indexOf(b.type.toLowerCase());
            return (tA === -1 ? 99 : tA) - (tB === -1 ? 99 : tB);
        });

        return sorted[0];
    }

    private buildMagnet(hash: string, title: string): string {
        const encodedTitle = encodeURIComponent(title);
        return `magnet:?xt=urn:btih:${hash}&dn=${encodedTitle}&tr=${TRACKERS}`;
    }
}
