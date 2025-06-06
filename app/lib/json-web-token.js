import jwt from "jsonwebtoken";

const refreshTokenDuration = 5 * 365 * 24 * 60 * 60;
const accessTokenDuration = 60 * 60 * 24;

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

export function generateToken(type) {
  if (type === "accessToken") {
    return jwt.sign(
      { appType: "yanghao", company: "hwdb" },
      ACCESS_TOKEN_SECRET,
      { expiresIn: accessTokenDuration }
    );
  }

  return jwt.sign(
    { appType: "yanghao", company: "hwdb" },
    REFRESH_TOKEN_SECRET,
    { expiresIn: refreshTokenDuration }
  );
}
