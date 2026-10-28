import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UsersService } from '../users/users.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';
import { CommentLike } from './entities/comment-like.entity';
import { Movie } from './entities/movie.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment)
    private readonly commentsRepository: Repository<Comment>,
    @InjectRepository(CommentLike)
    private readonly commentLikeRepository: Repository<CommentLike>,
    @InjectRepository(Movie)
    private readonly moviesRepository: Repository<Movie>,
    private readonly usersService: UsersService,
  ) {}

  async latestComments(limit = 20) {
    const comments = await this.commentsRepository.find({
      relations: { author: true, movie: true },
      order: { createdAt: 'DESC' },
      take: limit,
    });

    return comments.map((comment) => this.toResponse(comment));
  }

  async getComment(commentId: string) {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: { author: true, movie: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    return this.toResponse(comment);
  }

  async create(movieId: string, userId: string | undefined, dto: CreateCommentDto) {
    const movie = await this.moviesRepository.findOne({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    let user = userId ? await this.usersService.findById(userId) : null;
    if (!user) {
      // Fall back to first registered user
      const users = await this.usersService.findAll();
      user = users[0] ?? null;
    }

    if (!user) {
      throw new NotFoundException('User not found to post comment');
    }

    const comment = this.commentsRepository.create({
      content: dto.comment.trim(),
      movie,
      author: user,
    });

    const saved = await this.commentsRepository.save(comment);
    return this.getComment(saved.id);
  }

  async update(commentId: string, userId: string, dto: UpdateCommentDto) {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: { author: true, movie: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.author.id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    if (dto.comment) {
      comment.content = dto.comment.trim();
    }

    const saved = await this.commentsRepository.save(comment);
    return this.toResponse(saved);
  }

  async delete(commentId: string, userId: string) {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: { author: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    if (comment.author.id !== userId) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentsRepository.delete(commentId);
    return { success: true };
  }

  async getMovieComments(movieId: string, currentUserId?: string) {
    const movie = await this.moviesRepository.findOne({ where: { id: movieId } });
    if (!movie) {
      throw new NotFoundException('Movie not found');
    }

    const comments = await this.commentsRepository.find({
      where: { movie: { id: movieId } },
      relations: { author: true, movie: true },
      order: { createdAt: 'DESC' },
    });

    let likedSet = new Set<string>();
    if (currentUserId) {
      const userLikes = await this.commentLikeRepository.find({
        where: { userId: currentUserId },
        select: ['commentId'],
      });
      likedSet = new Set(userLikes.map((l) => l.commentId));
    }

    return comments.map((comment) =>
      this.toResponse(comment, likedSet.has(comment.id)),
    );
  }

  async likeComment(commentId: string, userId: string) {
    const comment = await this.commentsRepository.findOne({
      where: { id: commentId },
      relations: { author: true, movie: true },
    });

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    const existingLike = await this.commentLikeRepository.findOne({
      where: { commentId, userId },
    });

    let isLiked = false;
    if (existingLike) {
      // Toggle off / remove like
      await this.commentLikeRepository.delete(existingLike.id);
      isLiked = false;
    } else {
      // Add like
      const user = await this.usersService.findById(userId);
      if (!user) {
        throw new NotFoundException('User not found');
      }
      const newLike = this.commentLikeRepository.create({
        commentId,
        userId,
        comment,
        user,
      });
      await this.commentLikeRepository.save(newLike);
      isLiked = true;
    }

    const totalLikes = await this.commentLikeRepository.count({
      where: { commentId },
    });

    comment.likesCount = totalLikes;
    await this.commentsRepository.save(comment);

    return this.toResponse(comment, isLiked);
  }

  private toResponse(comment: Comment, isLiked = false) {
    return {
      id: comment.id,
      movieId: comment.movie?.id,
      authorId: comment.author?.id,
      authorUsername: comment.author?.username || comment.author?.fullName || 'User',
      authorAvatarUrl: comment.author?.avatarUrl,
      date: comment.createdAt,
      content: comment.content,
      likesCount: comment.likesCount || 0,
      isLiked,
    };
  }
}