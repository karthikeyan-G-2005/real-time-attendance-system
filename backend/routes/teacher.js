// backend/routes/teacher.js
const express = require('express');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const { verifyToken } = require('../middleware/auth'); // ✅ JWT middleware

const router = express.Router();

// ---------------- Get students list (with today's attendance) ----------------
router.get('/students', verifyToken, async (req, res) => {
  try {
    const students = await User.find({ role: 'student' }).select('_id username');

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Get today's attendance for all students
    const todaysRecords = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    const attendanceMap = {};
    todaysRecords.forEach(r => {
      attendanceMap[r.userId.toString()] = r.status;
    });

    // Attach today’s status to each student
    const result = students.map(s => ({
      _id: s._id,
      username: s.username,
      todayStatus: attendanceMap[s._id.toString()] || null
    }));

    res.json(result);
  } catch (err) {
    console.error('❌ Error fetching students:', err);
    res.status(500).json({ message: 'Failed to fetch students' });
  }
});

// ---------------- Mark attendance ----------------
router.post('/attendance', verifyToken, async (req, res) => {
  try {
    const { userId, status } = req.body;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    let record = await Attendance.findOne({
      userId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    if (record) {
      record.status = status;
      await record.save();
    } else {
      record = new Attendance({ userId, status, date: new Date() });
      await record.save();
    }

    res.json({ message: '✅ Attendance marked', record });
  } catch (err) {
    console.error('❌ Mark attendance error:', err);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
});

// ---------------- Delete today’s attendance ----------------
router.delete('/attendance/:studentId', verifyToken, async (req, res) => {
  try {
    const studentId = req.params.studentId;

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    await Attendance.deleteOne({
      userId: studentId,
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    res.json({ message: '✅ Attendance deleted' });
  } catch (err) {
    console.error('❌ Delete error:', err);
    res.status(500).json({ message: 'Failed to delete attendance' });
  }
});

// ---------------- Get history for a student ----------------
router.get('/attendance/:studentId', verifyToken, async (req, res) => {
  try {
    const studentId = req.params.studentId;
    const records = await Attendance.find({ userId: studentId }).sort({ date: -1 });
    res.json(records);
  } catch (err) {
    console.error('❌ History error:', err);
    res.status(500).json({ message: 'Failed to fetch history' });
  }
});

// ---------------- Get daily summary ----------------
router.get('/attendance-summary', verifyToken, async (req, res) => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const records = await Attendance.find({
      date: { $gte: startOfDay, $lte: endOfDay }
    });

    let summary = { present: 0, absent: 0, late: 0 };
    records.forEach(r => {
      if (r.status === 'present') summary.present++;
      else if (r.status === 'absent') summary.absent++;
      else if (r.status === 'late') summary.late++;
    });

    res.json(summary);
  } catch (err) {
    console.error('❌ Summary error:', err);
    res.status(500).json({ message: 'Failed to fetch summary' });
  }
});

module.exports = router;
