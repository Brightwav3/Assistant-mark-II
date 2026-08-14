import { defineCollection, z } from "astro:content";

const log = defineCollection({
  type: "content",
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    summary: z.string(),
    area: z.enum(["Voice", "Intelligence", "Audio", "Memory", "Platform"]),
    status: z.enum(["Ready", "Needs work", "Not built yet"]).default("Ready"),
    mark: z.enum(["I", "II", "III"]).default("II"),
  }),
});

export const collections = { log };
