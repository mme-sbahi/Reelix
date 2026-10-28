import {
  Body,
  BadRequestException,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentsService } from './comments.service';

@ApiTags('comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get the latest comments' })
  getLatestComments() {
    return this.commentsService.latestComments();
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a single comment' })
  getComment(@Param('id') id: string) {
    return this.commentsService.getComment(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a comment for a movie' })
  createComment(
    @Body() dto: CreateCommentDto,
    @CurrentUser('userId') userId: string,
  ) {
    if (!dto.movieId) {
      throw new BadRequestException('movieId is required');
    }

    return this.commentsService.create(dto.movieId, userId, dto);
  }

  @Post(':movieId/comments')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Create a comment for a movie' })
  createMovieComment(
    @Param('movieId') movieId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.commentsService.create(movieId, userId, dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a comment' })
  updateComment(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateCommentDto,
  ) {
    return this.commentsService.update(id, userId, dto);
  }

  @Post(':id/like')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Toggle like on a comment' })
  likeComment(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.commentsService.likeComment(id, userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a comment' })
  deleteComment(@Param('id') id: string, @CurrentUser('userId') userId: string) {
    return this.commentsService.delete(id, userId);
  }
}