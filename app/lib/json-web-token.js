import jwt from "jsonwebtoken";

const fiveYearsInSeconds = 5 * 365 * 24 * 60 * 60;

export function generateAccessToken() {
  return jwt.sign(
    { appType: "mini-app", company: "hwdb" },
    process.env.TOKEN_SECRET,
    { expiresIn: fiveYearsInSeconds }
  );
}
