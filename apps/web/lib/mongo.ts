import { Db, MongoClient } from "mongodb";

const globalForMongo = globalThis as typeof globalThis & {
  mongoClient?: MongoClient;
};

const uri = process.env.MONGODB_URL!;
const dbName = process.env.MONGODB_DB_NAME!;

const client =
  globalForMongo.mongoClient ??
  new MongoClient(uri);

if (process.env.NODE_ENV !== "production") {
  globalForMongo.mongoClient = client;
}

export async function getMongoDb(): Promise<Db> {
  await client.connect();
  return client.db(dbName);
}