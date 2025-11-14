const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: Date,
    default: Date.now,
    index: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late'],
    required: true
  }
});

// ✅ Ensure only one record per student per day
AttendanceSchema.index(
  { userId: 1, date: 1 },
  { unique: true, partialFilterExpression: { userId: { $exists: true } } }
);

// ✅ Ensure attendance only for students
AttendanceSchema.pre('save', async function (next) {
  const User = mongoose.model('User');
  const user = await User.findById(this.userId);

  if (!user || user.role !== 'student') {
    return next(new Error('Attendance can only be recorded for students.'));
  }
  next();
});

module.exports = mongoose.model('Attendance', AttendanceSchema);
