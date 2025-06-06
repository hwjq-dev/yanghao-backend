import jwt from "jsonwebtoken";
import { isEmpty } from "radash";

export function isAuthenticated(req, res, next) {
  const auth = req.session;

  const authHeader = req?.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (isEmpty(auth)) {
    if (!isEmpty(token)) {
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, __) => {
        if (err)
          return res.status(403).json({
            message: "Forbiden",
          });
        req.isAuthenticated = true;
        next();
      });
      return;
    }
    return res.status(401).json({
      message: "Unauthorized Access.",
    });
  }

  const sessionAccessToken = auth?.auth?.token;

  if (isEmpty(sessionAccessToken))
    return res.status(401).json({
      message: "Unauthorized Access.",
    });

  jwt.verify(sessionAccessToken, process.env.ACCESS_TOKEN_SECRET, (err, __) => {
    if (err)
      return res.status(403).json({
        message: "Forbiden",
      });
    req.isAuthenticated = true;
    next();
  });
}

export function authenticateRefreshToken(req, res, next) {
  const authHeader = req?.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!isEmpty(token)) {
    jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, (err, __) => {
      if (err)
        return res.status(403).json({
          message: "Forbiden",
        });
      req.isAuthenticated = true;
      next();
    });
    return;
  }
  return res.status(401).json({
    message: "Unauthorized Access.",
  });
}
