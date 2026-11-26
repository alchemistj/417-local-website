import type { APIRoute, GetStaticPaths } from "astro";
import { buildEventIcs } from "../../../../lib/eventCalendar";
import { eventPath, eventRouteParams } from "../../../../lib/eventPaths";
import { getAllSiteEvents } from "../../../../lib/loadEvents";
import { absoluteUrl } from "../../../../lib/site";
import type { EventData } from "../../../../lib/eventSchema";

export const getStaticPaths = (async () => {
  const events = await getAllSiteEvents();
  return events.map((event) => ({
    params: eventRouteParams(event),
    props: { event },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute<{ event: EventData }> = ({ props }) => {
  const event = props.event;
  const body = buildEventIcs(event, { pageUrl: absoluteUrl(eventPath(event)) });
  return new Response(body, {
    headers: { "Content-Type": "text/calendar; charset=utf-8" },
  });
};
