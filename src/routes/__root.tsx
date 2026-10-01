import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  useNavigate,
  useRouterState,
  HeadContent,
  Scripts,
  useParams,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { isLeague, LEAGUE_IDS, LEAGUES, type LeagueId } from "../lib/leagues";
import { setActiveLeague, useActiveLeague } from "../hooks/use-active-league";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-team px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-team px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const themeScript = `(function(){try{var t=JSON.parse(localStorage.getItem("nba.theme.team")||"null");if(t&&t.color){var c=String(t.color).replace("#","");var a=String(t.altColor||t.color).replace("#","");var s=document.createElement("style");s.id="team-theme";s.textContent=":root{--team:#"+c+";--team-accent:#"+a+"}";document.head.appendChild(s);}}catch(e){}})();`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Statline — NBA & NFL scores, box scores & favorites" },
      {
        name: "description",
        content:
          "Played NBA and NFL games, full box scores, and stats for the players and teams you follow.",
      },
      { property: "og:title", content: "Statline — NBA & NFL scores & box scores" },
      {
        property: "og:description",
        content: "Played games, box scores, and stats for your favorite NBA and NFL players and teams.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Public+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
    scripts: [{ children: themeScript }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

const navLinkClass =
  "rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground";

function SiteHeader() {
  const params = useParams({ strict: false }) as { league?: string };
  const activeLeague = useActiveLeague();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const league = isLeague(params.league) ? params.league : null;
  // The route's league wins; otherwise fall back to the remembered dashboard league.
  const current: LeagueId | null = league ?? activeLeague;

  const switchLeague = (id: LeagueId) => {
    setActiveLeague(id);
    if (pathname !== "/") navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="inline-block size-3 rounded-full bg-team" />
          <span className="font-display text-xl font-bold uppercase tracking-wide">Statline</span>
        </Link>
        <div
          role="group"
          aria-label="Switch league"
          className="flex items-center rounded-full border border-border p-0.5"
        >
          {LEAGUE_IDS.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => switchLeague(id)}
              className={
                "rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide transition-colors " +
                (current === id ? "bg-team text-white" : "text-muted-foreground hover:text-foreground")
              }
            >
              {LEAGUES[id].name}
            </button>
          ))}
        </div>
        {current ? (
          <nav className="ml-auto flex items-center gap-1 overflow-x-auto">
            <Link
              to="/$league"
              params={{ league: current }}
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground bg-muted" }}
              className={navLinkClass}
            >
              Games
            </Link>
            <Link
              to="/$league/teams"
              params={{ league: current }}
              activeProps={{ className: "text-foreground bg-muted" }}
              className={navLinkClass}
            >
              Teams
            </Link>
            <Link
              to="/$league/standings"
              params={{ league: current }}
              search={{ view: "conference" }}
              activeProps={{ className: "text-foreground bg-muted" }}
              className={navLinkClass}
            >
              Standings
            </Link>
            <Link
              to="/$league/leaders"
              params={{ league: current }}
              activeProps={{ className: "text-foreground bg-muted" }}
              className={navLinkClass}
            >
              Leaders
            </Link>
            <Link
              to="/$league/compare"
              params={{ league: current }}
              search={{ a: undefined, b: undefined }}
              activeProps={{ className: "text-foreground bg-muted" }}
              className={navLinkClass}
            >
              Compare
            </Link>
            <Link
              to="/"
              activeOptions={{ exact: true }}
              activeProps={{ className: "text-foreground bg-muted" }}
              className={navLinkClass}
            >
              Today
            </Link>
          </nav>
        ) : null}
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <SiteHeader />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-muted-foreground">
          Scores and stats via ESPN's public NBA and NFL feeds. Favorites are saved on this device only.
        </footer>
      </div>
    </QueryClientProvider>
  );
}
