export interface NightRaidEvent {
  name: string;
  map: string;
  icon: string;
  startTime: number;
  endTime: number;
}

export interface EventsResponse {
  data: NightRaidEvent[];
  cachedAt: number;
}

export interface TimerState {
  isLive: boolean;
  currentEvent: NightRaidEvent | null;
  nextEvent: NightRaidEvent | null;
  timeRemaining: number;
}
