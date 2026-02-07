import { defineDb, defineTable, column } from 'astro:db';

const Votes = defineTable({
  columns: {
    comic_id: column.text({ primaryKey: true }),
    count: column.number({ default: 0 }),
  }
});

const Users = defineTable({
  columns: {
    cookie_hash: column.text({ primaryKey: true }),
    voted_ids: column.text(), // JSON string of array
    created_at: column.date({ default: new Date() }),
  }
});

export default defineDb({
  tables: { Votes, Users }
});
