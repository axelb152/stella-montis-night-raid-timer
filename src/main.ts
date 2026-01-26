import { createApp } from 'vue'
import * as Sentry from '@sentry/vue'
import './style.css'
import App from './App.vue'

const app = createApp(App)

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  let tracesSampleRate = 0.1 // Default: 10%
  
  if (import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE) {
    const parsed = parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE)
    if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
      tracesSampleRate = parsed
    } else {
      console.warn(`Invalid VITE_SENTRY_TRACES_SAMPLE_RATE value: ${import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE}. Using default: ${tracesSampleRate}`)
    }
  }
  
  Sentry.init({
    app,
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate,
  })
}

app.mount('#app')
