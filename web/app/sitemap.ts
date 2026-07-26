import type { MetadataRoute } from "next";
import { FEATURES } from "@/lib/features";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://hedg.lol";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    // Gated sections stay out of the sitemap until their flag is on.
    ...(FEATURES.floor
      ? [{ url: `${base}/floor`, lastModified: new Date(), changeFrequency: "hourly" as const, priority: 0.9 }]
      : []),
    ...(FEATURES.launch
      ? [{ url: `${base}/launch`, lastModified: new Date(), changeFrequency: "weekly" as const, priority: 0.8 }]
      : []),
  ];
}
