<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import type { NightRaidEvent, TimerState } from '../types/events';
import {
  fetchEventsSchedule,
  filterStellaMontisNightRaids,
  findCurrentAndNextEvent,
} from '../services/metaforgeApi';

const events = ref<NightRaidEvent[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const now = ref(Date.now());

let timerInterval: number | null = null;
let fetchInterval: number | null = null;

const timerState = computed<TimerState>(() => {
  const { currentEvent, nextEvent } = findCurrentAndNextEvent(events.value);

  if (currentEvent) {
    return {
      isLive: true,
      currentEvent,
      nextEvent,
      timeRemaining: currentEvent.endTime - now.value,
    };
  }

  if (nextEvent) {
    return {
      isLive: false,
      currentEvent: null,
      nextEvent,
      timeRemaining: nextEvent.startTime - now.value,
    };
  }

  return {
    isLive: false,
    currentEvent: null,
    nextEvent: null,
    timeRemaining: 0,
  };
});

const formattedTime = computed(() => {
  const ms = timerState.value.timeRemaining;
  if (ms <= 0) return { hours: '00', minutes: '00', seconds: '00' };

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    hours: hours.toString().padStart(2, '0'),
    minutes: minutes.toString().padStart(2, '0'),
    seconds: seconds.toString().padStart(2, '0'),
  };
});

function formatEventTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    timeZoneName: 'short',
  });
}

async function loadEvents() {
  try {
    const response = await fetchEventsSchedule();
    events.value = filterStellaMontisNightRaids(response.data);
    error.value = null;
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Failed to load events';
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadEvents();

  timerInterval = window.setInterval(() => {
    now.value = Date.now();
  }, 1000);

  fetchInterval = window.setInterval(() => {
    loadEvents();
  }, 60000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
  if (fetchInterval) clearInterval(fetchInterval);
});
</script>

<template>
  <div class="min-h-screen bg-background relative overflow-hidden scanlines">
    <!-- Diagonal rainbow stripes - decorative element -->
    <div class="absolute top-0 right-0 w-2 h-full arc-gradient transform rotate-0 opacity-80" />
    <div class="absolute top-0 right-4 w-1 h-full arc-gradient transform rotate-0 opacity-60" />
    <div class="absolute top-0 right-7 w-0.5 h-full arc-gradient transform rotate-0 opacity-40" />

    <div class="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-8">
      <!-- Header -->
      <div class="text-center mb-4">
        <h1 class="text-foreground text-xl md:text-2xl font-bold tracking-wider uppercase">
          Stella Montis Night Raid
        </h1>
        <div class="h-0.5 w-48 mx-auto mt-3 arc-gradient" />
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="flex-1 flex items-center justify-center">
        <div class="text-foreground text-2xl animate-pulse">
          Loading event data...
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="flex-1 flex items-center justify-center">
        <div class="text-destructive text-2xl">
          Failed to load event schedule. Please try again later.
        </div>
      </div>

      <!-- No Events State -->
      <div v-else-if="!timerState.nextEvent && !timerState.currentEvent" class="flex-1 flex items-center justify-center">
        <div class="text-muted-foreground text-2xl">
          No upcoming Night Raids scheduled.
        </div>
      </div>

      <!-- Main Timer Display -->
      <div v-else class="text-center flex-1 flex flex-col justify-center">
        <!-- Active Raid State -->
        <template v-if="timerState.isLive">
          <div class="text-6xl sm:text-7xl md:text-8xl lg:text-[10rem] xl:text-[12rem] font-black uppercase tracking-wider animate-pulse-glow text-[hsl(var(--arc-red))] leading-none">
            Time to Raid
          </div>
          <div class="mt-8 text-muted-foreground text-lg">
            <span class="uppercase tracking-wider">Raid ends in: </span>
            <span class="text-foreground font-mono text-xl">
              {{ formattedTime.hours }}:{{ formattedTime.minutes }}:{{ formattedTime.seconds }}
            </span>
          </div>
        </template>

        <!-- Countdown State -->
        <template v-else>
          <div class="text-muted-foreground text-lg uppercase tracking-[0.2em] mb-6">
            Next Raid In
          </div>
          <div class="flex items-center justify-center gap-2 md:gap-6">
            <!-- Hours -->
            <div class="flex flex-col items-center">
              <div class="text-5xl md:text-7xl lg:text-9xl font-mono font-bold text-foreground arc-glow tracking-wider">
                {{ formattedTime.hours }}
              </div>
              <div class="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">
                Hours
              </div>
            </div>
            <span class="text-5xl md:text-7xl lg:text-8xl text-muted-foreground font-light">:</span>
            <!-- Minutes -->
            <div class="flex flex-col items-center">
              <div class="text-5xl md:text-7xl lg:text-9xl font-mono font-bold text-foreground arc-glow tracking-wider">
                {{ formattedTime.minutes }}
              </div>
              <div class="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">
                Minutes
              </div>
            </div>
            <span class="text-5xl md:text-7xl lg:text-8xl text-muted-foreground font-light">:</span>
            <!-- Seconds -->
            <div class="flex flex-col items-center">
              <div class="text-5xl md:text-7xl lg:text-9xl font-mono font-bold text-foreground arc-glow tracking-wider">
                {{ formattedTime.seconds }}
              </div>
              <div class="text-muted-foreground text-xs uppercase tracking-[0.2em] mt-2">
                Seconds
              </div>
            </div>
          </div>
        </template>
      </div>

      <!-- Event Info -->
      <div v-if="timerState.currentEvent || timerState.nextEvent" class="text-center text-muted-foreground text-sm mt-4">
        <p v-if="timerState.isLive && timerState.currentEvent">
          Event ends at
          <span class="text-foreground">{{ formatEventTime(timerState.currentEvent.endTime) }}</span>
        </p>
        <p v-else-if="timerState.nextEvent">
          Starts at
          <span class="text-foreground">{{ formatEventTime(timerState.nextEvent.startTime) }}</span>
        </p>
      </div>

      <!-- Attribution Footer -->
      <footer class="absolute bottom-4 left-0 right-0 text-center">
        <p class="text-muted-foreground text-xs">
          Data provided by
          <a
            href="https://metaforge.app/arc-raiders"
            target="_blank"
            rel="noopener noreferrer"
            class="text-[hsl(var(--arc-cyan))] hover:underline"
          >
            Metaforge
          </a>
        </p>
      </footer>
    </div>
  </div>
</template>
