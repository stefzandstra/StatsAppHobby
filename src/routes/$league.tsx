import { createFileRoute, notFound, Outlet } from "@tanstack/react-router";

import { isLeague } from "@/lib/leagues";

export const Route = createFileRoute("/$league")({
  beforeLoad: ({ params }) => {
    if (!isLeague(params.league)) throw notFound();
  },
  component: () => <Outlet />,
});
