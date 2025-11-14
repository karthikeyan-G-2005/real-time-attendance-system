const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Attendance = require('../models/Attendance');
const { verifyToken, isStudent } = require('../middleware/auth');

// All student routes require valid token & student role
router.use(verifyToken);
router.use(isStudent);

// ✅ Get logged-in student's profile
router.get('/profile', async (req, res) => {
  try {
    const student = await User.findById(req.user.id).select('-password');
    if (!student || student.role !== 'student') {
      return res.status(404).json({ message: 'Student not found' });
    }
    res.json(student);
  } catch (err) {
    console.error('Error fetching student profile:', err);
    res.status(500).json({ message: 'Server error while fetching profile' });
  }
});

// ✅ Get all attendance records for logged-in student
router.get('/attendance', async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.user.id })
      .sort({ date: -1 }); // newest first
    res.json(records);
  } catch (err) {
    console.error('Error fetching attendance records:', err);
    res.status(500).json({ message: 'Server error while fetching attendance' });
  }
});

// ✅ Add a new attendance record (self-check-in)
router.post('/attendance', async (req, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ message: 'Status is required' });
    }

    const record = new Attendance({
      userId: req.user.id,
      status,
    });
    await record.save();

    res.json({ message: 'Attendance marked successfully', record });
  } catch (err) {
    console.error('Error marking attendance:', err);
    res.status(500).json({ message: 'Server error while marking attendance' });
  }
});

// ✅ Update an attendance record
router.put('/attendance/:id', async (req, res) => {
  try {
    const { status } = req.body;
    const { id } = req.params;

    const record = await Attendance.findOneAndUpdate(
      { _id: id, userId: req.user.id },
      { status },
      { new: true }
    );

    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.json({ message: 'Attendance updated', record });
  } catch (err) {
    console.error('Error updating attendance:', err);
    res.status(500).json({ message: 'Server error while updating attendance' });
  }
});

// ✅ Delete an attendance record
router.delete('/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const record = await Attendance.findOneAndDelete({
      _id: id,
      userId: req.user.id,
    });

    if (!record) {
      return res.status(404).json({ message: 'Attendance record not found' });
    }

    res.json({ message: 'Attendance deleted' });
  } catch (err) {
    console.error('Error deleting attendance:', err);
    res.status(500).json({ message: 'Server error while deleting attendance' });
  }
});

module.exports = router;
