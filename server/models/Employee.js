import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  employeeId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  department: {
    type: String,
    required: true,
    trim: true
  },
  joiningDate: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  name: { 
    type: String, 
    required: true,
    trim: true 
  },
  email: { 
    type: String, 
    required: true,
    lowercase: true 
  },
  phone: { 
    type: String
  },
  contactNumber: { 
    type: String,
    required: true 
  },
  homeAddress: { 
    type: String,
    required: true
  },
  emergencyContact: { 
    type: String 
  },
  verificationIdType: { 
    type: String,
    enum: ['National ID', 'Passport', 'Driving License', 'Voter ID', 'Other'],
    default: 'National ID'
  },
  idNumber: {
    type: String,
    required: true,
    trim: true
  },
  role: { 
    type: String, 
    required: true 
  }, 
  employmentType: { 
    type: String, 
    enum: ['Full Time', 'Part Time', 'Contract'], 
    default: 'Full Time' 
  },
  salaryType: {
    type: String,
    enum: ['Monthly', 'Daily'],
    default: 'Monthly'
  },
  status: { 
    type: String, 
    enum: ['Active', 'On Leave', 'Terminated'], 
    default: 'Active' 
  },
  // --- Financial Logic ---
  dailyRate: { 
    type: Number, 
    required: true 
  },
  workingDays: { 
    type: Number, 
    default: 0 
  },
  lastAttendanceDate: { 
    type: Date, 
    default: null 
  },
  bankDetails: {
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String }, 
    branchName: { type: String }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

employeeSchema.virtual('totalSalary').get(function() {
  if (this.salaryType === 'Daily') {
    return (this.dailyRate * this.workingDays).toFixed(2);
  }
  return this.dailyRate.toFixed(2);
});

export default mongoose.model('Employee', employeeSchema);