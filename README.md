# 🎬 HyperTube (Reelix)

A full-stack video streaming platform: users sign in, browse a movie library aggregated from several external sources, and watch videos in the browser while they are still downloading. Formats the browser can't play (MKV, AVI…) are converted to MP4 on the fly, with subtitles in several languages.

Built with **NestJS**, **PostgreSQL**, **React** and **FFmpeg**, fully containerized with **Docker Compose**.

> Built as part of the 42 Network curriculum (HyperTube project, subject v7.1). All mandatory requirements and 5 bonus features are implemented. See [`MANDATORY_DOCUMENTATION.md`](MANDATORY_DOCUMENTATION.md) and [`BONUS_DOCUMENTATION.md`](BONUS_DOCUMENTATION.md) for the full breakdown.

---

## ✨ Features

### Authentication & users
- Registration and login with **bcrypt**-hashed passwords
- **OAuth 2.0 sign-in with 42 and Google** (Passport strategies)
- **JWT access + refresh tokens**
- Password reset by email with secure one-time tokens
- Profile management (avatar, email, password, preferred language); other users' emails are never exposed
- Public `POST /oauth/token` endpoint (client credentials and password grants)

### Library
- Search across **multiple external sources** (TMDB metadata, Archive.org public-domain catalog, and more)
- **Infinite scroll** with `IntersectionObserver`, no pagination buttons
- Sort by name, IMDb rating or year; filter by genre, rating, era and watched status
- **"Watched" badges** on movies the user has already seen

### Video
- **Streaming while downloading**: playback starts as soon as the first chunks are ready
- **HTTP range requests** for seeking and scrubbing
- **On-the-fly transcoding** with FFmpeg: MKV/AVI/MOV are converted to fragmented MP4 for the browser
- **Subtitles** in English, French and the user's preferred language (OpenSubtitles API)
- **Daily cleanup job** that deletes movies nobody has watched in 30 days
- Custom player with **playback speed controls** (0.5× to 2×)

### Social
- Comments on every movie, with **per-user likes**
- Click a comment author to open their public profile

### Security
- `helmet` HTTP headers, rate limiting (`@nestjs/throttler`)
- Input validation with `class-validator` DTOs
- Protection against SQL injection (TypeORM parameterized queries) and XSS
- Secrets kept in `.env`, never committed

### UI
- Multi-language interface (i18n) with a language switcher
- Full client-side routing: `/`, `/movie/:id`, `/profile/:id`, with working Back/Forward

---

## 🛠 Tech stack

| Layer | Technologies |
|---|---|
| **Frontend** | React, Vite, Lucide icons, custom CSS theme |
| **Backend** | NestJS, TypeScript, TypeORM, Passport (JWT, 42, Google), Swagger, `@nestjs/schedule`, `@nestjs/throttler` |
| **Video** | FFmpeg (`fluent-ffmpeg`), HTTP range streaming |
| **Database** | PostgreSQL 16 |
| **External APIs** | TMDB, Archive.org, OpenSubtitles |
| **DevOps** | Docker, Docker Compose, Makefile |

---

## 🚀 Getting started

**Requirements:** Docker and Docker Compose.

```bash
git clone https://github.com/mme-sbahi/Reelix.git
cd Reelix
make setup   # creates backend/.env from backend/.env.example
# edit backend/.env and add your API keys (see below)
make up      # builds and starts postgres + backend + frontend
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:3001 |
| API docs (Swagger) | http://localhost:3001/api |
| PostgreSQL | `localhost:5432` |

### Environment variables

All variables live in `backend/.env` (template: [`backend/.env.example`](backend/.env.example)).

| Group | Variables |
|---|---|
| App | `NODE_ENV`, `PORT`, `CORS_ORIGIN` |
| Database | `DATABASE_HOST`, `DATABASE_PORT`, `DATABASE_USER`, `DATABASE_PASSWORD`, `DATABASE_NAME` |
| JWT | `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRATION`, `JWT_REFRESH_SECRET`, `JWT_REFRESH_EXPIRATION` |
| TMDB | `TMDB_API_KEY`, `TMDB_BASE_URL`, `TMDB_IMAGE_BASE_URL` |
| Archive.org | `ARCHIVE_ORG_BASE_URL` |
| Subtitles | `OPENSUBTITLES_API_KEY` |
| Google OAuth | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL` |
| 42 OAuth | `FORTYTWO_CLIENT_ID`, `FORTYTWO_CLIENT_SECRET`, `FORTYTWO_CALLBACK_URL` |
| Mail (optional) | `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`, `MAIL_FROM` |

### Useful commands

```bash
make up-d          # start in the background
make logs          # follow logs from every service
make test          # run backend unit tests
make psql          # open a psql shell on the database
make down          # stop everything (keeps the data)
make clean         # stop and wipe the database volume
```

---

## 📁 Project structure

```
Reelix/
├── backend/                 # NestJS API
│   └── src/
│       ├── auth/            # JWT, refresh tokens, 42 + Google OAuth, /oauth/token
│       ├── users/           # profiles and settings
│       ├── videos/          # library, streaming, transcoding, subtitles, comments, cleanup job
│       ├── common/          # mail service, exception filter
│       └── config/          # TypeORM configuration
├── frontend/                # React + Vite app
│   └── src/
│       ├── pages/           # Auth, Library, Video, Profile
│       ├── components/      # header, poster cards, player UI, language switcher
│       └── i18n/            # translations
├── docker-compose.yml
└── Makefile
```

---

## ⚖️ Disclaimer

This is an educational project. Use it only with content you have the right to stream, such as public-domain films from Archive.org.
