// Cloudflare's published edge IP ranges (https://www.cloudflare.com/ips/).
// The Caddyfile in docker-compose.staging.yml trusts the same ranges so it
// forwards the real visitor IP instead of discarding it; this app-side copy
// is what Express and Better Auth use to recognize which X-Forwarded-For
// hop is Cloudflare (to skip over) versus the real client (to keep).
// Re-check periodically against the source, or automate via
// https://api.cloudflare.com/client/v4/ips.
export const CLOUDFLARE_PROXY_RANGES = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
];
