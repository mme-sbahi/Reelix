# hypertube — Backend

A NestJS + TypeORM + PostgreSQL API for the hypertube task manager.

**Status: Day 1 complete** — Docker, PostgreSQL, JWT Authentication, Users, Swagger.
Projects/Tasks/Comments modules land on Day 2.

## Stack

- NestJS 10, TypeORM 0.3, PostgreSQL 16
- JWT access + refresh tokens (passport-jwt), bcrypt password hashing
- class-validator / class-transformer for request validation & response sanitization
- Swagger (OpenAPI) auto-generated docs

## Quick start

```bash
cp .env.example .env
docker-compose up --build
```

That's it. This starts:
- `postgres` — Postgres 16 on `5432`
- `backend` — NestJS API on `3001`, hot-reloading from `./src`

Swagger docs: **http://localhost:3001/api**

## Running without Docker

```bash
npm install
cp .env.example .env   # then point DATABASE_HOST to localhost
npm run start:dev
```

You'll need a local Postgres instance matching the `.env` credentials.

## Auth flow

1. `POST /auth/register` → creates the user, returns `{ user, accessToken, refreshToken }`
2. `POST /auth/login` → same response shape
3. Send `Authorization: Bearer <accessToken>` on protected routes (`GET /auth/profile`, etc.)
4. When the access token expires, call `POST /auth/refresh` with `Authorization: Bearer <refreshToken>` to get a new pair
5. `POST /auth/logout` clears the stored refresh token hash server-side

Refresh tokens are never stored in plaintext — only a bcrypt hash lives on the
`users.hashed_refresh_token` column, and it's rotated on every refresh.

## Routes implemented (Day 1)

```
POST /auth/register
POST /auth/login
POST /auth/refresh   (requires refresh token)
POST /auth/logout    (requires access token)
GET  /auth/profile   (requires access token)
```

## Project structure

```
src
├── auth
│   ├── decorators/current-user.decorator.ts
│   ├── dto/            (register, login, tokens)
│   ├── guards/         (JwtAuthGuard, JwtRefreshGuard)
│   ├── interfaces/     (JwtPayload)
│   ├── strategies/     (JwtStrategy, JwtRefreshStrategy)
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   └── auth.service.ts
├── users
│   ├── entities/user.entity.ts
│   ├── dto/create-user.dto.ts
│   ├── users.module.ts
│   └── users.service.ts
├── common
│   └── filters/http-exception.filter.ts
├── config
│   └── typeorm.config.ts
├── app.module.ts
└── main.ts
```

## Design notes

- **Password & refresh-token hashes are never serialized.** They're marked
  `@Exclude()` on the entity and stripped a second time in `AuthService` before
  the response leaves the controller — belt and suspenders.
- **`synchronize: true`** is used for Day 1-2 development speed. Before this
  goes anywhere near production it should switch to TypeORM migrations
  (`npm run migration:generate` / `migration:run` scripts are already wired up
  against `src/config/typeorm.config.ts`).
- **Global `ValidationPipe`** (`whitelist` + `forbidNonWhitelisted`) rejects any
  request body field not declared on a DTO — this is what `@IsString() @Length(3,100)`-style
  decorators actually enforce.
- **Two separate JWT strategies** (`jwt`, `jwt-refresh`) with two secrets and
  two guards, so an access token can never be replayed against `/auth/refresh`
  and vice versa.

## Next up (Day 2)

- `projects` + `project_members` (many-to-many with roles: OWNER/ADMIN/MEMBER)
- `tasks` with `TaskStatus` / `Priority` enums
- `comments`
- `ProjectOwnerGuard` for authorization on project-scoped routes
