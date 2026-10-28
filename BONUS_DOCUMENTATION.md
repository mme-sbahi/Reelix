# HyperTube — Bonus Part Documentation

This document describes all the **Bonus Features** implemented in the HyperTube project (in accordance with **Chapter IV - Bonus Part** of the 42 subject).

---

## Summary of Implemented Bonus Features

| # | Bonus Feature | Location / Components | Description |
|---|---|---|---|
| **1** | **Per-User Comment Likes / Upvotes System** | `backend/src/videos/entities/comment-like.entity.ts`<br>`backend/src/videos/entities/comment.entity.ts`<br>`backend/src/videos/comments.service.ts`<br>`backend/src/videos/comments.controller.ts`<br>`hypertube-design/src/pages/VideoPage.jsx` | Authenticated users can like comments. Each user can only like a comment once. Clicking again removes the like (toggle). Different users liking the comment properly increments the total count (1, 2, ...), and each user sees their own liked state (`isLiked`) and total count in real-time. |
| **2** | **Full Browser URL Routing & History Navigation** | `hypertube-design/src/App.jsx`<br>`hypertube-design/src/pages/VideoPage.jsx`<br>`hypertube-design/src/pages/ProfilePage.jsx` | Full SPA History API routing (`/`, `/movie/:id`, `/profile/:id`, `/profile/me`). Clicking a user's profile from movie comments and clicking "Back" returns the user directly to the exact movie they were watching. Direct link access, page refreshes, and browser Back/Forward buttons work seamlessly. |
| **3** | **Advanced Multi-Dimensional Library Filters** | `hypertube-design/src/pages/LibraryPage.jsx` | Enhanced library filtering controls allowing instant filtering by: <br>• **Watched Status** (`All`, `Watched Only`, `Unwatched Only`)<br>• **IMDb Rating Threshold** (`All Ratings`, `5.0+ ⭐`, `7.0+ ⭐`, `8.0+ ⭐`)<br>• **Production Era / Period** (`All Years`, `2020s Recent`, `2010s`, `2000s`, `Classics < 2000`) |
| **4** | **Video Player Playback Speed Controls** | `hypertube-design/src/pages/VideoPage.jsx`<br>`hypertube-design/src/styles/theme.css` | Integrated variable playback speed bar directly on the custom video player (`0.5x`, `0.75x`, `1.0x Normal`, `1.25x`, `1.5x`, `2.0x`) with active speed indicator. |
| **5** | **Extended RESTful API Endpoints** | `backend/src/videos/comments.controller.ts` | Additional REST routes for liking, updating, and interacting with comments beyond base requirements (`POST /comments/:id/like`). |

---

## Detailed Implementation Breakdown

### 1. Per-User Comment Likes System
- **Database (`comment_likes` Table)**:
  - Created `CommentLike` entity with unique composite index `(user_id, comment_id)`.
  - Ensures a user cannot duplicate likes on the same comment.
- **Backend Service & Controller**:
  - `POST /comments/:id/like` toggles the like:
    - If user has not liked: inserts record and increments total count.
    - If user has already liked: deletes record and decrements total count.
  - Returns `{ likesCount: number, isLiked: boolean }`.
  - `GET /movies/:id/comments` extracts the requester's JWT and returns `isLiked: true/false` for every comment for that specific user.
- **Frontend**:
  - Heart icon displays filled state when `isLiked: true` and outline when `false`.
  - Clicking toggles state optimistically and syncs with backend response.

### 2. URL Routing & Back Navigation
- **Routes Managed**:
  - `/` -> Library grid
  - `/movie/:id` -> Video stream and details page for `:id`
  - `/profile/:id` -> Public profile view for user `:id`
  - `/profile/me` -> Authenticated user's editable profile
  - `/auth` -> Authentication & Password reset
- **Context Preservation**:
  - User watching movie `/movie/123` clicks comment author `@alice` -> navigates to `/profile/user-alice-id`.
  - Clicking "Back" (or browser back button) returns immediately to `/movie/123` with no loss of context.
  - Clicking "HYPERTUBE" logo or "Library" in header navigates to `/` at any time.

### 3. Advanced Library Filtering
- **Watched / Unwatched Filter**:
  - Leverages the `WatchedMovie` backend tracking data to filter out already watched or unwatched movies.
- **Rating Filter**:
  - Allows users to quickly find top-rated titles (`5+`, `7+`, `8+` stars).
- **Era / Decade Filter**:
  - Organizes movies by era (`2020s`, `2010s`, `2000s`, `Classics`).

### 4. Video Player Speed Controller
- A sleek, responsive control bar added below the video player.
- Allows switching video playback rates dynamically (`0.5x` to `2.0x`).

---

## Verification & Build Status
- **Backend**: `npm run build` completed with 0 errors / 0 warnings.
- **Frontend**: `npm run build` completed with 0 errors / 0 warnings.
