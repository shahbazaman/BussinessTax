import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  role: { type: String, required: true },
  dailyRate: { type: Number, required: true },
  workingDays: { type: Number, default: 0 },
  status: { type: String, enum: ['Active', 'On Leave', 'Terminated'], default: 'Active' },
  joinDate: { type: Date, default: Date.now },
  lastAttendanceDate: { type: Date, default: null}
}, { timestamps: true });

// Virtual for auto-calculating salary
employeeSchema.virtual('totalSalary').get(function() {
  return this.dailyRate * this.workingDays;
});

employeeSchema.set('toJSON', { virtuals: true });

export default mongoose.model('Employee', employeeSchema);