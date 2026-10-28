# Hypertube — design preview (Vite + React)

A front-end-only visual prototype of the Hypertube subject: auth, library
(search / filter / sort / infinite scroll), video detail (buffering player,
subtitles, comments), and profile. No backend, torrent, or OAuth logic is
wired up — this is the design layer to build the real app on top of.

## Design direction

**"The last screening of the night"** — a dark cinema-house theme instead of
a generic streaming-site look, since the subject is about waiting for a reel
to arrive and then watching it.

- **Palette** — near-black void, warm marquee amber, velvet crimson for the
  "unwatched" dot, cool ink/gray for meta text. See `src/styles/theme.css`
  `:root` block for the token list.
- **Type** — condensed marquee display face (Bebas Neue) for titles/logo,
  Inter for UI text, IBM Plex Mono for data (ratings, seeders, runtime).
- **Signature element** — `ReelSpinner`, a sprocket-hole reel that spins
  wherever the app is buffering: on the video page while the torrent
  "downloads enough to start", and on the library's infinite scroll.
- **Ambient background** — `AmbientBackground` renders a slow projector-beam
  sweep + subtle film-grain overlay behind every page. Disabled entirely
  under `prefers-reduced-motion`.

## Structure

```
index.html                     entry HTML, loads the three fonts
src/
  main.jsx                     React root + global stylesheet import
  App.jsx                      page state / simple client-side "router"
  styles/theme.css             all design tokens + component styles
  data/movies.js                sample movie data + poster gradient palette
  data/users.js                  current user + other users (profile rules)
  components/
    AmbientBackground.jsx      projector-beam + grain background
    ReelSpinner.jsx            sprocket-hole loading spinner
    Field.jsx                  labeled input used across auth/profile
    Header.jsx                 logo, search, nav, avatar menu
    PosterCard.jsx             thumbnail card + rating badge
  pages/
    AuthPage.jsx                login / register, OAuth buttons (42 + GitHub)
    LibraryPage.jsx             search, genre chips, sort, infinite scroll
    VideoPage.jsx                stream page: cached-vs-torrent state, cover
                                 art, subtitle auto-detect, linked comments
    ProfilePage.jsx              one component, two modes — see below
```

## Profile page: owner vs. viewer (subject III.1)

`ProfilePage` takes a `userId` prop and decides which mode to render by
comparing it to `CURRENT_USER.id` (`src/data/users.js`):

- **Owner** (`userId === CURRENT_USER.id`, or viewing your own via the
  header avatar menu) — editable first/last name, **email**, preferred
  language and bio, an "Edit profile" toggle, and your watch history. A
  small note makes explicit that the email field is never shown to anyone
  else.
- **Someone else's profile** (`userId` is any other user's id — e.g.
  clicking a commenter's name on the stream page) — read-only: avatar,
  name, username, bio, join date. No email field exists in this branch at
  all, and there's no edit button, so the privacy rule can't be bypassed
  from the UI.

`App.jsx` holds `profileUserId` and exposes `openProfile(userId)`, passed
into `VideoPage` as `onOpenProfile` so comment authors are clickable links
to their public profile.

## Stream page notes (subject III.3)

`VideoPage` distinguishes a `movie.cached` (already downloaded, saved on
the server) title from one that still needs to start a torrent — different
`ReelSpinner` label and a shorter/longer simulated buffering delay for
each, echoing the "download once, reuse until a month unwatched" rule.
`movie.language` vs. the current user's `preferredLanguage` also drives a
small subtitle auto-fetch note.

## Run it

```bash
npm install
npm run dev
```

Then open the printed local URL (default `http://localhost:5173`).

## Wiring it to the real subject

This prototype fakes everything with local state and `setTimeout`s. To turn
it into the actual Hypertube app you'd replace, per page:

- `AuthPage` → real register/login endpoints + OmniAuth-style OAuth
  (42 strategy + one more), forgot-password email flow.
- `LibraryPage` → real search hitting at least two external sources,
  server-paginated results behind the same `IntersectionObserver` sentinel.
- `VideoPage` → actual torrent-backed streaming: kick off the download on
  first request, flip `buffering` to `false` once enough data is buffered
  server-side (not a fixed timer), subtitle track fetched/converted on
  demand, comments persisted via the `/comments` and `/movies/:id/comments`
  API routes from the subject.
- `ProfilePage` → real profile GET/PATCH against `/users/:id`, respecting
  that email must stay private to non-owners.
