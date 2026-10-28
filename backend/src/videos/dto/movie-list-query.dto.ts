import { Transform } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class MovieListQueryDto {
  @IsOptional()
  @IsString()
  query?: string;

  @IsOptional()
  @Transform(({ value }) => Number.parseInt(value, 10))
  @IsInt()
  @Min(1)
  page?: number = 1;
}