import type { APIRoute, GetStaticPaths } from "astro";
import { getRecurring } from "../../../../../lib/loadEvents";
import { isMonthlySeries, recurringCitySlug, seriesIcsBody, seriesSlug, upcomingDates } from "../../../../../lib/recurring";

export const getStaticPaths = (async () => {
  const now = new Date();
  const items = await getRecurring();
  return items
    .filter((item) => isMonthlySeries(item) && upcomingDates(item, now, 1).length > 0)
    .map((item) => ({
      params: { city: recurringCitySlug(item), id: seriesSlug(item) },
      props: { item },
    }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const body = seriesIcsBody(props.item);
  if (!body) return new Response("Not found", { status: 404 });
  return new Response(body, { headers: { "Content-Type": "text/calendar; charset=utf-8" } });
};
