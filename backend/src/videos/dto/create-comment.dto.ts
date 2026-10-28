import { IsOptional, IsString, Length } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @Length(1, 5000)
  comment: string;

  @IsOptional()
  @IsString()
  movieId?: string;
}