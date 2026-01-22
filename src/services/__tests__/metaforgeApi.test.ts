import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  filterStellaMontisNightRaids,
  findCurrentAndNextEvent,
  fetchEventsSchedule,
} from '../metaforgeApi';
import type { NightRaidEvent } from '../../types/events';

const createEvent = (
  overrides: Partial<NightRaidEvent> = {}
): NightRaidEvent => ({
  name: 'Night Raid',
  map: 'Stella Montis',
  icon: 'https://cdn.metaforge.app/arc-raiders/custom/night.webp',
  startTime: Date.now(),
  endTime: Date.now() + 3600000,
  ...overrides,
});

describe('filterStellaMontisNightRaids', () => {
  it('returns only Night Raid events on Stella Montis', () => {
    const events: NightRaidEvent[] = [
      createEvent({ name: 'Night Raid', map: 'Stella Montis' }),
      createEvent({ name: 'Night Raid', map: 'Dam' }),
      createEvent({ name: 'Harvester', map: 'Stella Montis' }),
      createEvent({ name: 'Night Raid', map: 'Stella Montis' }),
    ];

    const filtered = filterStellaMontisNightRaids(events);

    expect(filtered).toHaveLength(2);
    expect(filtered.every((e) => e.name === 'Night Raid')).toBe(true);
    expect(filtered.every((e) => e.map === 'Stella Montis')).toBe(true);
  });

  it('returns empty array when no matching events', () => {
    const events: NightRaidEvent[] = [
      createEvent({ name: 'Harvester', map: 'Dam' }),
      createEvent({ name: 'Matriarch', map: 'Blue Gate' }),
    ];

    const filtered = filterStellaMontisNightRaids(events);

    expect(filtered).toHaveLength(0);
  });

  it('handles empty input array', () => {
    const filtered = filterStellaMontisNightRaids([]);
    expect(filtered).toHaveLength(0);
  });
});

describe('findCurrentAndNextEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('finds current event when time is within event window', () => {
    const now = new Date('2026-01-23T10:30:00Z').getTime();
    vi.setSystemTime(now);

    const events: NightRaidEvent[] = [
      createEvent({
        startTime: new Date('2026-01-23T10:00:00Z').getTime(),
        endTime: new Date('2026-01-23T11:00:00Z').getTime(),
      }),
    ];

    const { currentEvent, nextEvent } = findCurrentAndNextEvent(events);

    expect(currentEvent).not.toBeNull();
    expect(nextEvent).toBeNull();
  });

  it('finds next event when no current event', () => {
    const now = new Date('2026-01-23T09:00:00Z').getTime();
    vi.setSystemTime(now);

    const events: NightRaidEvent[] = [
      createEvent({
        startTime: new Date('2026-01-23T10:00:00Z').getTime(),
        endTime: new Date('2026-01-23T11:00:00Z').getTime(),
      }),
    ];

    const { currentEvent, nextEvent } = findCurrentAndNextEvent(events);

    expect(currentEvent).toBeNull();
    expect(nextEvent).not.toBeNull();
  });

  it('finds both current and next event', () => {
    const now = new Date('2026-01-23T10:30:00Z').getTime();
    vi.setSystemTime(now);

    const events: NightRaidEvent[] = [
      createEvent({
        startTime: new Date('2026-01-23T10:00:00Z').getTime(),
        endTime: new Date('2026-01-23T11:00:00Z').getTime(),
      }),
      createEvent({
        startTime: new Date('2026-01-23T14:00:00Z').getTime(),
        endTime: new Date('2026-01-23T15:00:00Z').getTime(),
      }),
    ];

    const { currentEvent, nextEvent } = findCurrentAndNextEvent(events);

    expect(currentEvent).not.toBeNull();
    expect(nextEvent).not.toBeNull();
    expect(nextEvent!.startTime).toBe(
      new Date('2026-01-23T14:00:00Z').getTime()
    );
  });

  it('returns nulls for empty events array', () => {
    const { currentEvent, nextEvent } = findCurrentAndNextEvent([]);

    expect(currentEvent).toBeNull();
    expect(nextEvent).toBeNull();
  });

  it('sorts events by start time before processing', () => {
    const now = new Date('2026-01-23T09:00:00Z').getTime();
    vi.setSystemTime(now);

    // Events provided out of order
    const events: NightRaidEvent[] = [
      createEvent({
        startTime: new Date('2026-01-23T14:00:00Z').getTime(),
        endTime: new Date('2026-01-23T15:00:00Z').getTime(),
      }),
      createEvent({
        startTime: new Date('2026-01-23T10:00:00Z').getTime(),
        endTime: new Date('2026-01-23T11:00:00Z').getTime(),
      }),
    ];

    const { nextEvent } = findCurrentAndNextEvent(events);

    // Should find the earlier event as next
    expect(nextEvent!.startTime).toBe(
      new Date('2026-01-23T10:00:00Z').getTime()
    );
  });
});

describe('fetchEventsSchedule', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns data from API on success', async () => {
    const mockData = {
      data: [createEvent()],
      cachedAt: Date.now(),
    };

    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response);

    const result = await fetchEventsSchedule();

    expect(result.data).toHaveLength(1);
    expect(fetch).toHaveBeenCalled();
  });

  it('returns mock data when API fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

    const result = await fetchEventsSchedule();

    // Should return mock data (generated events)
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].name).toBe('Night Raid');
    expect(result.data[0].map).toBe('Stella Montis');
  });

  it('returns mock data when API returns non-ok status', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
    } as Response);

    const result = await fetchEventsSchedule();

    expect(result.data.length).toBeGreaterThan(0);
  });
});
