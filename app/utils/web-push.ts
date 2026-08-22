import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:no-reply@outpost.sayerscloud.com",
  process.env.BUN_PUBLIC_VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY,
);

export { webpush };
