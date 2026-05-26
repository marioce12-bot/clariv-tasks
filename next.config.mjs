import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ request }) => request.destination === "document",
        handler: "NetworkFirst",
        options: {
          cacheName: "clariv-pages",
          expiration: { maxEntries: 32, maxAgeSeconds: 60 * 60 * 24 * 7 }
        }
      },
      {
        urlPattern: ({ url }) => url.origin.includes("firestore.googleapis.com"),
        handler: "NetworkFirst",
        options: {
          cacheName: "clariv-firestore",
          networkTimeoutSeconds: 8,
          expiration: { maxEntries: 64, maxAgeSeconds: 60 * 60 * 24 }
        }
      }
    ]
  }
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true
};

export default withPWA(nextConfig);
