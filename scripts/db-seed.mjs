// Writes the demo restaurants. Each one is replaced by slug (upsert), so running
// it again resets them without touching anything else in the database.
// Run: npm run db:seed (after db:setup)
import { MongoClient } from "mongodb";
import { DB_NAME, RESTAURANTS } from "../src/db/config.js";
import { seedRestaurants } from "../src/db/seed-data.js";

const client = new MongoClient(process.env.MONGODB_URI, { appName: "sufra-scripts" });

// Every dish gets a tags array, even when the seed leaves it out
const normalize = (restaurant) => ({
  ...restaurant,
  menu: restaurant.menu.map((category) => ({
    ...category,
    items: category.items.map((dish) => ({ tags: [], ...dish })),
  })),
});

try {
  const restaurants = client.db(DB_NAME).collection(RESTAURANTS);
  for (const restaurant of seedRestaurants) {
    const { upsertedCount } = await restaurants.replaceOne({ slug: restaurant.slug }, normalize(restaurant), { upsert: true });
    const dishes = restaurant.menu.reduce((sum, category) => sum + category.items.length, 0);
    console.log(`${upsertedCount ? "Added" : "Replaced"} ${restaurant.slug} (${dishes} dishes)`);
  }
} finally {
  await client.close();
}
