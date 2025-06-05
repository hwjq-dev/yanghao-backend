import Redis from "ioredis";

let redis = null;

export function connectRedis() {
  if (redis) return redis;

  redis = new Redis({
    port: +process.env.REDIS_PORT || 6379,
    host: process.env.REDIS_HOST || "127.0.0.1",
    username: "default",
    password: process.env.REDIS_PASSWORD || "12345",
  });

  redis.on("connect", () =>
    console.log("Redis cache is connected successfully.")
  );

  redis.on("error", () => console.log("Redis cache failed to connect."));
  redis.on("close", () => console.log("Redis cache connection closed."));

  return redis;
}
