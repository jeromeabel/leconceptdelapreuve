import { db, Votes } from 'astro:db';

export default async function seed() {
  // Seed initial comics votes
  await db.insert(Votes).values([
    { comic_id: 'le-debut', count: 0 },
    { comic_id: 'la-suite', count: 0 },
    { comic_id: 'la-fin', count: 0 },
  ]);
}
