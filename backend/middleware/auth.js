// backend/middleware/auth.js
const jwt = require("jsonwebtoken");

function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader) {
    return res.status(400).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1]; // "Bearer <token>"
  if (!token) {
    return res.status(400).json({ message: "Invalid token format" });
  }

  jwt.verify(token, "your-secret-key", (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // ✅ Debug log
    console.log("✅ Decoded JWT:", decoded);

    req.user = decoded;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({ message: "Access denied! Admin only." });
  }
  next();
}

function isTeacher(req, res, next) {
  if (req.user.role !== "teacher") {
    return res.status(403).json({ message: "Access denied! You are not a teacher." });
  }
  next();
}

function isStudent(req, res, next) {
  if (req.user.role !== "student") {
    return res.status(403).json({ message: "Access denied! Students only." });
  }
  next();
}

module.exports = { verifyToken, isAdmin, isTeacher, isStudent };
