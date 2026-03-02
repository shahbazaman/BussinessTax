import mongoose from 'mongoose';

const employeeSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  
  // --- Core Identity & Contact ---
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
    type: String, 
    required: true 
  },
  homeAddress: { 
    type: String 
  },
  emergencyContact: { 
    type: String 
  },

  // --- Employment Details ---
  role: { 
    type: String, 
    required: true 
  }, // Designation
  employmentType: { 
    type: String, 
    enum: ['Full-time', 'Part-time', 'Contract', 'Commission-based'], 
    default: 'Full-time' 
  },
  status: { 
    type: String, 
    enum: ['Active', 'On Leave', 'Terminated'], 
    default: 'Active' 
  },
  joinDate: { 
    type: Date, 
    default: Date.now 
  },

  // --- Attendance & Payroll Logic ---
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

  // --- Banking (For Account Integration) ---
  bankDetails: {
    bankName: { type: String },
    accountNumber: { type: String },
    ifscCode: { type: String }, // Or SWIFT
    branchName: { type: String }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

/**
 * Virtual: Salary Calculation
 * Dynamically computes total payable based on current session's working days
 */
employeeSchema.virtual('totalSalary').get(function() {
  return (this.dailyRate * this.workingDays).toFixed(2);
});

export default mongoose.model('Employee', employeeSchema);