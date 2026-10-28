import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Movie } from './movie.entity';

@Entity('comments')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'content', type: 'text' })
  content: string;

  @ManyToOne(() => Movie, (movie) => movie.comments, { onDelete: 'CASCADE' })
  movie: Movie;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  author: User;

  @Column({ name: 'likes_count', type: 'int', default: 0 })
  likesCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}