import { useCallback, useEffect, useState } from "react";
import AmbientBackground from "./components/AmbientBackground.jsx";
import Header from "./components/Header.jsx";
import Footer from "./components/Footer.jsx";
import AuthPage from "./pages/AuthPage.jsx";
import LibraryPage from "./pages/LibraryPage.jsx";
import VideoPage from "./pages/VideoPage.jsx";
import ProfilePage from "./pages/ProfilePage.jsx";
import { getStoredUser, logout as authLogout, getProfile,isAuthenticated } from "./utils/auth.js"; 
import { useLanguage } from "./i18n/LanguageContext.jsx";


function getRouteFromUrl() {
  const path = window.location.pathname;
  if (path === "/auth") {
    return { page: "auth", movieId: null, profileUserId: null };
  }
  if (path.startsWith("/movie/")) {
    const movieId = path.replace("/movie/", "").split("/")[0].trim();
    return { page: "video", movieId: movieId || null, profileUserId: null };
  }
  if (path.startsWith("/profile/")) {
    const rawId = path.replace("/profile/", "").split("/")[0].trim();
    const profileUserId = rawId === "me" ? null : rawId || null;
    return { page: "profile", movieId: null, profileUserId };
  }
  return { page: "library", movieId: null, profileUserId: null };
}

export default function App() {
  const { syncWithUser } = useLanguage();
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [route, setRoute] = useState(getRouteFromUrl());


  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeMovie, setActiveMovie] = useState(() => {
    const r = getRouteFromUrl();
    return r.movieId ? { id: r.movieId } : null;
  });

  // Sync state on popstate (browser back/forward)
  useEffect(() => {
    const handlePopState = () => {
      // Just follow the URL. (The old check looked for an "accessToken" in
      // localStorage, but tokens live in HttpOnly cookies, so it was always
      // missing and every back-navigation was sent to /auth.)
      const r = getRouteFromUrl();
      setRoute(r);
      if (r.page === "video" && r.movieId) {
        setActiveMovie((prev) => (prev?.id === r.movieId ? prev : { id: r.movieId }));
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Handle OAuth callback tokens or session expiry
  useEffect(() => {
    // Google / 42 OAuth: the backend already set the HttpOnly cookies and
    // redirected here, so we only need to load the user's profile.
    if (window.location.pathname === "/auth/callback") {
      window.history.replaceState(null, "", "/");
      getProfile()
        .then((user) => {
          if (user) {
            setCurrentUser(user);
            syncWithUser(user);
            setRoute({ page: "library", movieId: null, profileUserId: null });
          } else {
            window.history.replaceState(null, "", "/auth");
            setRoute({ page: "auth", movieId: null, profileUserId: null });
          }
        })
        .catch(() => {});
    }

    const handleExpiry = () => {
      setCurrentUser(null);
      if (window.location.pathname !== "/auth") {
        window.history.pushState(null, "", "/auth");
      }
      setRoute({ page: "auth", movieId: null, profileUserId: null });
    };
    window.addEventListener("ht:session-expired", handleExpiry);
    return () => window.removeEventListener("ht:session-expired", handleExpiry);
  }, []);

  const navigate = useCallback((path, newRouteState = null, movieObj = null) => {
    if (window.location.pathname !== path) {
      window.history.pushState(null, "", path);
    }
    const computed = newRouteState || getRouteFromUrl();
    setRoute(computed);
    if (movieObj) {
      setActiveMovie(movieObj);
    } else if (computed.movieId) {
      setActiveMovie((prev) => (prev?.id === computed.movieId ? prev : { id: computed.movieId }));
    }
  }, []);

  const handleEnter = useCallback((user) => {
    setCurrentUser(user);
    syncWithUser(user);
    navigate("/", { page: "library", movieId: null, profileUserId: null });
  }, [navigate, syncWithUser]);

  const handleLogout = useCallback(async () => {
    await authLogout(); // calls POST /auth/logout then clears localStorage
    setCurrentUser(null);
    setActiveMovie(null);
    setMenuOpen(false);
    navigate("/auth", { page: "auth", movieId: null, profileUserId: null });
  }, [navigate]);

  const openMovie = useCallback((movie) => {
    navigate(`/movie/${movie.id}`, { page: "video", movieId: movie.id, profileUserId: null }, movie);
  }, [navigate]);

  const openProfile = useCallback((userId) => {
    const targetId = userId ?? currentUser?.id;
    const path = targetId && targetId !== currentUser?.id ? `/profile/${targetId}` : "/profile/me";
    navigate(path, { page: "profile", movieId: null, profileUserId: targetId || null });
  }, [currentUser, navigate]);

  const handleBack = useCallback(() => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      navigate("/", { page: "library", movieId: null, profileUserId: null });
    }
  }, [navigate]);

  const page = route.page;
  const profileUserId = route.profileUserId ?? currentUser?.id ?? null;
  const movieToPlay = activeMovie || (route.movieId ? { id: route.movieId } : null);

  return (
    <div className="ht-root">
      <AmbientBackground />

      {page !== "auth" && (
        <Header
          page={page}
          setPage={(p) => navigate(p === "library" ? "/" : `/${p}`, { page: p, movieId: null, profileUserId: null })}
          query={query}
          setQuery={setQuery}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          onOpenOwnProfile={() => openProfile(currentUser?.id)}
          onLogout={handleLogout}
          user={currentUser}
        />
      )}

      <main className="ht-main">
        {page === "auth" && <AuthPage onEnter={handleEnter} />}
        {page === "library" && <LibraryPage query={query} onOpen={openMovie} />}
        {page === "video" && (
          <VideoPage
            movie={movieToPlay}
            onBack={handleBack}
            onOpenProfile={openProfile}
            currentUser={currentUser}
          />
        )}
        {page === "profile" && (
          <ProfilePage
            userId={profileUserId}
            currentUser={currentUser}
            onUpdateUser={(updated) => {
              setCurrentUser(updated);
              localStorage.setItem("user", JSON.stringify(updated));
            }}
            onBack={handleBack}
          />
        )}
      </main>

      {page !== "auth" && <Footer />}
    </div>
  );
}

