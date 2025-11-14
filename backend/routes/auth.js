const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");   // MongoDB model
const redis = require("../redisClient");  // Redis client instance

const router = express.Router();

// ------------------- REGISTER (Students only) -------------------
router.post("/register", async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({ message: "Username, password, and role required" });
    }

    // ✅ Only students can self-register
    if (role !== "student") {
      return res.status(403).json({
        message: "Only students can self-register. Teachers/Admins must be created by Admin.",
      });
    }

    const existing = await User.findOne({ username, role: "student" });
    if (existing) {
      return res.status(400).json({ message: "Username already taken" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const newStudent = new User({
      username,
      password: hashed,
      role: "student",
      isApproved: true,
    });

    await newStudent.save();
    res.json({ message: "Student registered successfully!" });
  } catch (err) {
    console.error("❌ Register error:", err);
    res.status(500).json({ message: "Server error while registering student" });
  }
});

// ------------------- FORGOT PASSWORD (no old password) -------------------
router.post("/forgot-password", async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ message: "Username and new password are required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    await user.save();

    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ message: "Server error while updating password" });
  }
});

// Reset password (without old password)
router.post("/reset-password", async (req, res) => {
  try {
    const { username, newPassword } = req.body;

    if (!username || !newPassword) {
      return res.status(400).json({ message: "Username and new password required" });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Error updating password:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;

// ------------------- LOGIN -------------------
router.post("/login", async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role) {
      return res.status(400).json({ message: "Username, password, and role required" });
    }

    let user = null;
    let isMatch = false;

    if (role === "student" || role === "admin") {
      // 🔎 Look in MongoDB
      user = await User.findOne({ username, role });
      if (!user) {
        return res.status(401).json({ message: "Invalid username or role" });
      }

      isMatch = await bcrypt.compare(password, user.password);
    } else if (role === "teacher") {
      // 🔎 Look in Redis
      const key = `teacher:${username}`;
      const teacherData = await redis.hGetAll(key);

      if (!teacherData || !teacherData.password) {
        return res.status(401).json({ message: "Invalid teacher username" });
      }

      // Try bcrypt compare (for hashed passwords)
      try {
        isMatch = await bcrypt.compare(password, teacherData.password);
      } catch {
        isMatch = false;
      }

      // Fallback to plain text
      if (!isMatch && password === teacherData.password) {
        isMatch = true;
      }

      if (isMatch) {
        user = {
          id: teacherData.id || Date.now().toString(),
          username: teacherData.username || username,
          role: teacherData.role || "teacher",
        };
      }
    }

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // ✅ Create JWT token
    const token = jwt.sign(
      { id: user._id || user.id, role: user.role },
      "your-secret-key",
      { expiresIn: "1h" }
    );

    res.json({ token, role: user.role });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Server error while logging in" });
  }
});

module.exports = router;
