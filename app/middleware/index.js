import jwt from "jsonwebtoken";

export function authenticateToken(req, res, next) {
  const authHeader = req?.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token == null)
    return res.status(401).json({
      message: "Unauthorized Access.",
    });

  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {
    if (err)
      return res.status(403).json({
        message: "Forbiden",
      });
    req.user = user;
    next();
  });
}
