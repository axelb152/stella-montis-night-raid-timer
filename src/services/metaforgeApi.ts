import type { EventsResponse, NightRaidEvent } from '../types/events';

// Use relative path in dev (proxied by Vite), absolute in production
const API_BASE_URL = import.meta.env.DEV
  ? '/api/arc-raiders'
  : 'https://metaforge.app/api/arc-raiders';

// Generate mock Night Raid events for Stella Montis as fallback
// Schedule: Every 4 hours at 02:00, 06:00, 10:00, 14:00, 18:00, 22:00 UTC (1 hour each)
// Source: Analyzed from Metaforge API data
function generateMockEvents(): NightRaidEvent[] {
  const events: NightRaidEvent[] = [];
  const now = new Date();

  // Generate events for today and the next 7 days
  for (let dayOffset = -1; dayOffset <= 7; dayOffset++) {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() + dayOffset);
    date.setUTCMinutes(0, 0, 0);

    // Night Raid times in UTC: every 4 hours starting at 02:00
    const raidHours = [2, 6, 10, 14, 18, 22];

    for (const hour of raidHours) {
      const startTime = new Date(date);
      startTime.setUTCHours(hour, 0, 0, 0);

      const endTime = new Date(startTime);
      endTime.setUTCHours(hour + 1, 0, 0, 0);

      events.push({
        name: 'Night Raid',
        map: 'Stella Montis',
        icon: 'https://cdn.metaforge.app/arc-raiders/custom/night.webp',
        startTime: startTime.getTime(),
        endTime: endTime.getTime(),
      });
    }
  }

  return events;
}

export async function fetchEventsSchedule(): Promise<EventsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/events-schedule`);

    if (!response.ok) {
      throw new Error(`Failed to fetch events: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    console.warn('API fetch failed, using mock data:', error);
    // Return mock data as fallback when API fails (e.g., CORS issues in production)
    return {
      data: generateMockEvents(),
      cachedAt: Date.now(),
    };
  }
}

export function filterStellaMontisNightRaids(events: NightRaidEvent[]): NightRaidEvent[] {
  return events.filter(
    (event) => event.name === 'Night Raid' && event.map === 'Stella Montis'
  );
}

export function findCurrentAndNextEvent(events: NightRaidEvent[]): {
  currentEvent: NightRaidEvent | null;
  nextEvent: NightRaidEvent | null;
} {
  const now = Date.now();
  const sortedEvents = [...events].sort((a, b) => a.startTime - b.startTime);

  let currentEvent: NightRaidEvent | null = null;
  let nextEvent: NightRaidEvent | null = null;

  for (const event of sortedEvents) {
    if (now >= event.startTime && now < event.endTime) {
      currentEvent = event;
    } else if (now < event.startTime && !nextEvent) {
      nextEvent = event;
    }

    if (currentEvent && nextEvent) break;
  }

  return { currentEvent, nextEvent };
}
