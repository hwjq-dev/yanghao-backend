import mongoose from "mongoose";
import dotenv from "dotenv";
dotenv.config();

const MONGO_USERNAME = process.env.MONGO_USERNAME;
const MONGO_PASSWORD = process.env.MONGO_PASSWORD;
const MONGO_HOSTNAME = process.MONGO_HOSTNAME || "127.0.0.1";
const MONGO_PORT = +process.env.MONGO_PORT || "27017";
const MONGO_DB = process.env.MONGO_DB;

export function connectDB() {
  const url = `mongodb://${MONGO_USERNAME}:${MONGO_PASSWORD}@${MONGO_HOSTNAME}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;
  mongoose.connect(url, { useNewUrlParser: true, useUnifiedTopology: true });

  const db = mongoose.connection;

  db.on("error", console.error.bind(console, "Connection error:"));
  db.once("open", () => console.log("Connected to MongoDB database"));
}
