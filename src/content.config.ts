import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const comics = defineCollection({
	loader: glob({ pattern: '**/*.md', base: './src/content/comics' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			date: z.date(),
			image: image(),
			alt: z.string(),
		}),
});

export const collections = { comics };
