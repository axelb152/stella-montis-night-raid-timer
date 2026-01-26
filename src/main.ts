import { createApp } from 'vue'
import * as Sentry from '@sentry/vue'
import './style.css'
import App from './App.vue'

const app = createApp(App)

const sentryDsn = import.meta.env.VITE_SENTRY_DSN
if (sentryDsn) {
  const tracesSampleRate = import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE
    ? parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE)
    : 0.1
  
  Sentry.init({
    app,
    dsn: sentryDsn,
    environment: import.meta.env.MODE,
    tracesSampleRate,
  })
}

app.mount('#app')
