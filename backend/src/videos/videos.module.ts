import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { User } from '../users/entities/user.entity';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { Comment } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { Movie } from './entities/movie.entity';
import { WatchedMovie } from './entities/watched-movie.entity';
import { MoviesController } from './movies.controller';
import { MoviesService } from './movies.service';
import { StreamService } from './stream.service';
import { YtsService } from './yts.service';
import { CleanupService } from './cleanup.service';
import { SubtitlesService } from './subtitles.service';
import { OpenSubtitlesService } from './opensubtitles.service';

@Module({
  imports: [UsersModule, TypeOrmModule.forFeature([Movie, Comment, User, WatchedMovie, CommentLike])],
  controllers: [MoviesController, CommentsController],
  providers: [MoviesService, CommentsService, StreamService, YtsService, CleanupService, SubtitlesService, OpenSubtitlesService],
})
export class VideosModule { }