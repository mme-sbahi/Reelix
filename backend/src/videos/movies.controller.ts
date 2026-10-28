import { Body, Controller, Get, Header, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { MovieListQueryDto } from './dto/movie-list-query.dto';
import { CommentsService } from './comments.service';
import { MoviesService } from './movies.service';
import { StreamService } from './stream.service';

@ApiTags('movies')
@Controller('movies')
export class MoviesController {
  constructor(
    private readonly moviesService: MoviesService,
    private readonly commentsService: CommentsService,
    private readonly streamService: StreamService,
  ) { }

  private extractUser(req: Request): { userId?: string; preferredLang?: string } {
    try {
      let token: string | undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      } else if (req.cookies?.accessToken) {
        token = req.cookies.accessToken;
      } else if (typeof req.query.token === 'string') {
        token = req.query.token;
      }

      if (token) {
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
          return {
            userId: payload.sub || payload.userId,
            preferredLang: payload.preferredLanguage,
          };
        }
      }
    } catch {
      /* ignore decoding error */
    }
    return {};
  }

  @Get()
  @ApiOperation({ summary: 'List movies for the front page' })
  getFrontPage(@Query() query: MovieListQueryDto, @Req() req: Request) {
    const { userId } = this.extractUser(req);
    return this.moviesService.getFrontPageMovies(query.query, query.page ?? 1, userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get movie details' })
  getMovie(@Param('id') id: string, @Req() req: Request) {
    const { userId, preferredLang } = this.extractUser(req);
    return this.moviesService.getMovieDetails(id, undefined, userId, preferredLang);
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Create a comment for a movie' })
  async createMovieComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @Req() req: Request,
  ) {
    const { userId } = this.extractUser(req);
    return this.commentsService.create(id, userId, dto);
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get movie comments' })
  getMovieComments(@Param('id') id: string, @Req() req: Request) {
    const { userId } = this.extractUser(req);
    return this.commentsService.getMovieComments(id, userId);
  }

  @Post(':id/watch')
  @ApiOperation({ summary: 'Mark movie as watched' })
  markAsWatched(@Param('id') id: string, @Req() req: Request) {
    const { userId } = this.extractUser(req);
    if (!userId) {
      return { success: false, message: 'Authentication required' };
    }
    return this.moviesService.markAsWatched(id, userId);
  }

  @Get(':id/subtitles')
  @ApiOperation({ summary: 'Get available subtitle tracks for a movie' })
  async getSubtitles(@Param('id') id: string, @Req() req: Request) {
    const { userId, preferredLang } = this.extractUser(req);
    const movie = await this.moviesService.getMovieDetails(id, undefined, userId, preferredLang);
    return movie.subtitles || [];
  }

  @Get(':id/subtitles/:lang')
  @Header('Content-Type', 'text/vtt')
  @ApiOperation({ summary: 'Get WebVTT subtitle file content for a movie' })
  getSubtitleContent(
    @Param('id') id: string,
    @Param('lang') lang: string,
  ) {
    return this.moviesService.getMovieSubtitleContent(id, lang);
  }

  @Get(':id/stream')
  @ApiOperation({ summary: 'Stream the selected movie' })
  async streamMovie(
    @Param('id') id: string,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const { userId } = this.extractUser(request);
    const { magnetUrl, archiveStreamUrl } = await this.moviesService.getMovieForStream(id, userId);
    if (magnetUrl) {
      await this.streamService.streamTorrent(magnetUrl, request, response);
    } else if (archiveStreamUrl) {
      await this.streamService.streamSource(archiveStreamUrl, request, response);
    } else {
      response.status(404).json({ message: 'No stream source found for this movie' });
    }
  }
}