import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://fyrst.fun";
  return [
    { url: base, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
    { url: `${base}/dashboard`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
    { url: `${base}/launch`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.8 },
  ];
}
