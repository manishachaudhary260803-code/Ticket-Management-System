import "dotenv/config"
import * as Sentry from "@sentry/node"

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? "development",
    tracesSampleRate: Number(process.env.SENTRY_TRACES_SAMPLE_RATE ?? 0.1),
    dataCollection: {
      // To disable sending user data and HTTP bodies, uncomment the lines below. For more info visit:
      // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#dataCollection
      // userInfo: false,
      // httpBodies: [],
    },
  })
} else {
  console.log("SENTRY_DSN is not set — error reporting to Sentry is disabled")
}
