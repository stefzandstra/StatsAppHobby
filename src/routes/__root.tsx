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
  type LinkProps,
} from "@tanstack/react-router";
import {
  CalendarDays,
  House,
  ListOrdered,
  Moon,
  Shield,
  Star,
  Sun,
  Trophy,
  Users,
} from "lucide-react";
import { useEffect, useState, type ComponentType, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { isLeague, LEAGUE_IDS, LEAGUES, type LeagueId } from "../lib/leagues";
import { setActiveLeague, useActiveLeague } from "../hooks/use-active-league";
import { cn } from "../lib/utils";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Pagina niet gevonden</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Deze pagina bestaat niet (meer) of is verplaatst.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Naar Vandaag
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
          Deze pagina kon niet laden
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Er ging iets mis aan onze kant. Probeer het opnieuw of ga terug naar Vandaag.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Opnieuw proberen
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Naar Vandaag
          </a>
        </div>
      </div>
    </div>
  );
}

const themeScript = `(function(){try{if(localStorage.getItem("statline.theme")==="dark")document.documentElement.classList.add("dark");}catch(e){}try{var t=JSON.parse(localStorage.getItem("nba.theme.team")||"null");if(t&&t.color){var c=String(t.color).replace("#","");var a=String(t.altColor||t.color).replace("#","");var s=document.createElement("style");s.id="team-theme";s.textContent=":root{--team:#"+c+";--team-accent:#"+a+"}";document.head.appendChild(s);document.documentElement.setAttribute("data-team-theme","");}}catch(e){}})();`;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Statline — NBA & NFL uitslagen, box scores en favorieten" },
      {
        name: "description",
        content:
          "Gespeelde NBA- en NFL-wedstrijden, volledige box scores en statistieken van de spelers en teams die je volgt.",
      },
      { property: "og:title", content: "Statline — NBA & NFL scores & box scores" },
      {
        property: "og:description",
        content:
          "Played games, box scores, and stats for your favorite NBA and NFL players and teams.",
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
        href: "https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=Inter:wght@400;500;600;700&display=swap",
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
    <html lang="nl" suppressHydrationWarning>
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

type NavItem = {
  key: string;
  label: string;
  short?: string;
  icon: ComponentType<{ className?: string }>;
  link: LinkProps;
  match: (path: string) => boolean;
  mobile: boolean;
};

function navItems(league: LeagueId): NavItem[] {
  const under = (section: string) => (path: string) =>
    section
      ? path.startsWith(`/${league}/${section}`)
      : path === `/${league}` || path === `/${league}/` || path.startsWith(`/${league}/game/`);
  return [
    {
      key: "today",
      label: "Vandaag",
      icon: House,
      link: { to: "/" },
      match: (p) => p === "/",
      mobile: true,
    },
    {
      key: "games",
      label: "Wedstrijden",
      icon: CalendarDays,
      link: { to: "/$league", params: { league } },
      match: under(""),
      mobile: true,
    },
    {
      key: "standings",
      label: "Stand",
      icon: ListOrdered,
      link: { to: "/$league/standings", params: { league }, search: { view: "conference" } },
      match: under("standings"),
      mobile: true,
    },
    {
      key: "leaders",
      label: "Leiders",
      icon: Trophy,
      link: { to: "/$league/leaders", params: { league } },
      match: under("leaders"),
      mobile: true,
    },
    {
      key: "teams",
      label: "Teams",
      icon: Shield,
      link: { to: "/$league/teams", params: { league } },
      match: under("teams"),
      mobile: false,
    },
    {
      key: "compare",
      label: "Vergelijk",
      icon: Users,
      link: { to: "/$league/compare", params: { league }, search: { a: undefined, b: undefined } },
      match: under("compare"),
      mobile: false,
    },
    {
      key: "favorites",
      label: "Favorieten",
      short: "Mijn",
      icon: Star,
      link: { to: "/$league/favorites", params: { league } },
      match: under("favorites"),
      mobile: true,
    },
  ];
}

/** Sections that exist for every league; detail pages fall back to their list. */
const LEAGUE_SECTIONS = ["standings", "leaders", "teams", "compare", "favorites"];

function useCurrentLeague() {
  const params = useParams({ strict: false }) as { league?: string };
  const activeLeague = useActiveLeague();
  // The route's league wins; otherwise fall back to the remembered league.
  return (isLeague(params.league) ? params.league : null) ?? activeLeague ?? "nba";
}

function LeagueSwitch() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const current = useCurrentLeague();

  const switchLeague = (id: LeagueId) => {
    setActiveLeague(id);
    const [, league, section] = pathname.split("/");
    if (!isLeague(league)) return; // Today stays put; its own filter handles leagues.
    const keep = section && LEAGUE_SECTIONS.includes(section) ? `/${section}` : "";
    navigate({ href: `/${id}${keep}` });
  };

  return (
    <div
      role="group"
      aria-label="Kies competitie"
      className="flex items-center rounded-full bg-secondary p-1"
    >
      {LEAGUE_IDS.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => switchLeague(id)}
          aria-pressed={current === id}
          className={cn(
            "min-h-9 rounded-full px-4 text-xs font-bold uppercase tracking-wide transition-colors",
            current === id
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {LEAGUES[id].name}
        </button>
      ))}
    </div>
  );
}

const THEME_KEY = "statline.theme";

/** Light by default; dark is opt-in and remembered on this device. */
function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={dark}
      aria-label={dark ? "Licht thema" : "Donker thema"}
      title={dark ? "Licht thema" : "Donker thema"}
      className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}

function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = navItems(useCurrentLeague());

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur-md">
      <div aria-hidden="true" className="theme-strip absolute inset-x-0 top-0 hidden h-[3px]" />
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
        <Link
          to="/"
          className="flex min-h-11 items-center gap-2"
          aria-label="Statline — naar Vandaag"
        >
          <span className="inline-block size-2.5 rounded-full bg-brand" />
          <span className="font-display text-xl font-bold uppercase tracking-wide">Statline</span>
        </Link>
        <nav aria-label="Hoofdnavigatie" className="hidden flex-1 items-center gap-1 md:flex">
          {items.map((item) => {
            const active = item.match(pathname);
            return (
              <Link
                key={item.key}
                {...item.link}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-9 items-center rounded-full px-3 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-1 md:ml-0">
          {/* Today has its own league filter; one league control per screen. */}
          {pathname !== "/" ? <LeagueSwitch /> : null}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

/** Thumb-reachable primary navigation on phones (Apple HIG tab bar). */
function MobileTabBar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const items = navItems(useCurrentLeague()).filter((i) => i.mobile);

  return (
    <nav
      aria-label="Hoofdnavigatie"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <div className="mx-auto grid max-w-md grid-cols-5">
        {items.map((item) => {
          const active = item.match(pathname);
          const Icon = item.icon;
          return (
            <Link
              key={item.key}
              {...item.link}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
                active ? "text-foreground" : "text-subtle-foreground",
              )}
            >
              <Icon className={cn("size-5", active && "text-brand")} />
              {item.short ?? item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0">
        <SiteHeader />
        {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
        <Outlet />
        <footer className="mx-auto max-w-6xl px-4 py-10 text-xs text-subtle-foreground">
          Uitslagen en statistieken via de publieke NBA- en NFL-feeds van ESPN. Favorieten worden
          alleen op dit apparaat bewaard.
        </footer>
        <MobileTabBar />
      </div>
    </QueryClientProvider>
  );
}
