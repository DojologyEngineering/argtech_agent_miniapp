import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow the ngrok tunnel host to load dev assets when testing inside Telegram.
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io", "*.ngrok-free.dev"],

  // Orders are view-only for field agents: raised in the Buyer App or Admin Portal.
  // Keep the old create/edit URLs from opening the agent-side order builder.
  async redirects() {
    return [
      { source: "/orders/new", destination: "/orders", permanent: false },
      { source: "/orders/:id/edit", destination: "/orders/:id", permanent: false },
    ];
  },
};

export default nextConfig;
