import { registerAs } from '@nestjs/config';
import { DataSource, DataSourceOptions } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  username: process.env.DATABASE_USER || 'hypertube',
  password: process.env.DATABASE_PASSWORD || 'hypertube_password',
  database: process.env.DATABASE_NAME || 'hypertube_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  // NOTE: synchronize is convenient for Day 1-2 development but should be
  // switched to migrations before this ever touches a real environment.
  synchronize: true,
  logging: process.env.NODE_ENV === 'development',
};

export default registerAs('typeorm', () => dataSourceOptions);

export const connectionSource = new DataSource(dataSourceOptions);
