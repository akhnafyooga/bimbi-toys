// Opens an ngrok tunnel to the local dev server so Midtrans (and other
// external services) can reach the webhook at /api/midtrans-webhook.
//
// Usage:  npm run tunnel          (defaults to port 3000)
//         npm run tunnel -- 3001  (custom port)
//
// The authtoken is read from NGROK_AUTHTOKEN in .env (loaded via --env-file).

import ngrok from "@ngrok/ngrok";

const port = Number(process.argv[2]) || 3000;
const authtoken = process.env.NGROK_AUTHTOKEN;

if (!authtoken) {
  console.error("❌ NGROK_AUTHTOKEN is missing from .env");
  process.exit(1);
}

const listener = await ngrok.forward({ addr: port, authtoken });
const url = listener.url();

console.log("\n✅ ngrok tunnel is live");
console.log(`   Public URL:  ${url}`);
console.log(`   Forwarding:  ${url} -> http://localhost:${port}`);
console.log("\n📌 Set this in Midtrans Dashboard → Settings → Configuration → Payment Notification URL:");
console.log(`   ${url}/api/midtrans-webhook`);
console.log("\nPress Ctrl+C to stop.\n");

process.on("SIGINT", async () => {
  await listener.close();
  process.exit(0);
});

// Keep the event loop busy so the process stays alive for the tunnel's lifetime.
setInterval(() => {}, 1 << 30);
