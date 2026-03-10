import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL || "https://hedg.lol";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/floor`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/launch`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];
}
