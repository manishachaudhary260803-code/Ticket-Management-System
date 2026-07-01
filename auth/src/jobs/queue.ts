import PgBoss from "pg-boss"

export const QUEUE_CLASSIFY_TICKET = "classify-ticket"

let bossPromise: Promise<PgBoss> | null = null

export function getBoss(): Promise<PgBoss> {
  if (!bossPromise) {
    bossPromise = (async () => {
      const boss = new PgBoss(process.env.DATABASE_URL ?? "")
      boss.on("error", (err: Error) => console.error("pg-boss error", err))
      await boss.start()
      await boss.createQueue(QUEUE_CLASSIFY_TICKET, {
        name: QUEUE_CLASSIFY_TICKET,
        retryLimit: 3,
        retryDelay: 2,
        retryBackoff: true,
      })
      return boss
    })()
  }
  return bossPromise
}
