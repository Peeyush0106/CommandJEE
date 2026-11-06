import { onSchedule } from "firebase-functions/v2/scheduler";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
initializeApp();
const db = getFirestore();

// Starter scheduled worker. Add FCM token registration, due-task querying,
// user timezone handling, quiet-hour checks and idempotent send logging.
export const reminderHeartbeat = onSchedule("every 15 minutes", async () => {
  const now = new Date();
  console.log("CommandJEE reminder worker heartbeat", now.toISOString());
  // Intentionally does not send notifications until user preferences,
  // tokens and notification consent have been implemented.
  await db.collection("_system").doc("reminderHeartbeat").set({
    lastRunAt: now.toISOString()
  }, { merge: true });
});
