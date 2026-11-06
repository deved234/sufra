// The database starts alongside the CI job and may not be answering yet
import { MongoClient } from "mongodb";

const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 2000 });
for (let attempt = 1; ; attempt++) {
  try {
    await client.db("admin").command({ ping: 1 });
    console.log(`The database answered on attempt ${attempt}`);
    break;
  } catch (error) {
    if (attempt === 30) throw error;
  }
}
await client.close();
