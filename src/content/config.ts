import { defineCollection, z } from 'astro:content';

const comicsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    author: z.string(),
    date: z.date(),
    panel1: z.string(), // Path to panel 1 image
    panel2: z.string(), // Path to panel 2 image
    description: z.string().optional(),
  }),
});

export const collections = {
  comics: comicsCollection,
};
