// backend/routes/admin.js
const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');       // MongoDB model for students + admins
const { verifyToken, isAdmin } = require('../middleware/auth');
const redis = require('../redisClient');      // Redis client

const router = express.Router();

// ✅ Secure all admin routes
router.use(verifyToken);
router.use(isAdmin);

// ----------------- TEACHERS (stored in Redis) -----------------
// Add new teacher
router.post('/add-teacher', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    // Check if teacher already exists
    const exists = await redis.exists(`teacher:${username}`);
    if (exists) {
      return res.status(400).json({ message: 'Teacher already exists' });
    }

    // Hash password before saving
    const hashedPassword = await bcrypt.hash(password, 10);

    // ✅ Use single-field hSet for compatibility
    const key = `teacher:${username}`;
    await redis.hSet(key, 'id', Date.now().toString());
    await redis.hSet(key, 'username', username);
    await redis.hSet(key, 'password', hashedPassword);
    await redis.hSet(key, 'role', 'teacher');

    res.json({ message: 'Teacher added successfully (Redis)' });
  } catch (err) {
    console.error('❌ Error adding teacher:', err);
    res.status(500).json({ message: 'Server error while adding teacher' });
  }
});
// Get all teachers
router.get('/teachers', async (req, res) => {
  try {
    const keys = await redis.keys('teacher:*');
    const teachers = [];

    for (let key of keys) {
      const type = await redis.type(key);
      if (type !== 'hash') {
        console.warn(`⚠️ Skipping invalid Redis key: ${key} (${type})`);
        continue;
      }

      const teacherData = await redis.hGetAll(key);
      if (teacherData && teacherData.username) {
        teachers.push({
          id: teacherData.id,
          username: teacherData.username,
        });
      }
    }

    res.json(teachers);
  } catch (err) {
    console.error('❌ Error fetching teachers:', err);
    res.status(500).json({ message: 'Server error while fetching teachers' });
  }
});


// Delete Teacher
    function deleteTeacher(username) {
      if (!confirm(`Delete teacher ${username}?`)) return;
      $.ajax({
        url: `${API_BASE}/teachers/${username}`,
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + token },
        success: () => {
          alert("Teacher deleted successfully");
          loadTeachers();
        },
        error: (xhr) => {
          // Check the HTTP status code for more specific error handling
          if (xhr.status === 404) {
            console.error(`❌ Delete Teacher failed: Teacher with username "${username}" not found.`);
            alert(`Error: Teacher "${username}" not found.`);
          } else {
            console.error("❌ Delete Teacher failed:", xhr.responseText);
            alert("An error occurred while deleting the teacher.");
          }
        }
      });
    }


// ----------------- STUDENTS (stored in MongoDB) -----------------

// Add new student
router.post('/add-student', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ message: 'Username and password required' });
    }

    const existing = await User.findOne({ username, role: 'student' });
    if (existing) {
      return res.status(400).json({ message: 'Student already exists' });
    }

    const student = new User({
      username,
      password,
      role: 'student',
      isApproved: true,
    });

    await student.save();
    res.json({ message: 'Student added successfully (MongoDB)' });
  } catch (err) {
    console.error('❌ Error adding student:', err);
    res.status(500).json({ message: 'Server error while adding student' });
  }
});

// Get all students
router.get('/students', async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('-password');
    res.json(students);
  } catch (err) {
    console.error('❌ Error fetching students:', err);
    res.status(500).json({ message: 'Server error while fetching students' });
  }
});

// Delete student
router.delete('/students/:id', async (req, res) => {
  try {
    const result = await User.findByIdAndDelete(req.params.id);

    if (!result) {
      return res.status(404).json({ message: 'Student not found' });
    }

    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    console.error('❌ Error deleting student:', err);
    res.status(500).json({ message: 'Server error while deleting student' });
  }
});

module.exports = router;
