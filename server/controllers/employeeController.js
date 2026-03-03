import Employee from '../models/Employee.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

// @desc    Get all employees for logged in user
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ user: req.user._id });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add new employee with nested bank details
export const addEmployee = async (req, res) => {
  try {
    const { 
      name, email, phone, role, dailyRate, 
      contactNumber, homeAddress, verificationIdType, idNumber, 
      bankName, accountNumber, employmentType 
    } = req.body;

    const employee = new Employee({
      user: req.user._id,
      name, 
      email, 
      phone, 
      role, 
      dailyRate: Number(dailyRate),
      contactNumber, 
      homeAddress, 
      verificationIdType: verificationIdType || 'National ID', 
      idNumber,
      employmentType: employmentType || 'Full-time',
      bankDetails: {
        bankName: bankName || '',
        accountNumber: accountNumber || ''
      }
    });
    
    await employee.save();
    res.status(201).json(employee);
  } catch (error) {
    console.error("Creation Error:", error.message);
    res.status(400).json({ message: "Creation failed: " + error.message });
  }
};

// @desc    Update employee profile & handle nested bank details
export const updateEmployee = async (req, res) => {
  try {
    const { bankName, accountNumber, ...otherData } = req.body;

    // Prepare update object to handle nested bankDetails correctly
    const updateData = {
      ...otherData,
      bankDetails: {
        bankName: bankName,
        accountNumber: accountNumber
      }
    };

    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: updateData }, 
      { new: true, runValidators: true } 
    );

    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: "Update failed: " + error.message });
  }
};

// @desc    Mark daily attendance
export const updateAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, user: req.user._id });
    if (!employee) return res.status(404).json({ message: "Employee record not found" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastDate = employee.lastAttendanceDate ? new Date(employee.lastAttendanceDate) : null;
    if (lastDate) lastDate.setHours(0, 0, 0, 0);

    if (lastDate && lastDate.getTime() === today.getTime()) {
      return res.status(400).json({ message: "Attendance already marked for today" });
    }

    employee.workingDays += 1;
    employee.lastAttendanceDate = new Date();
    await employee.save();

    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: "Attendance update failed: " + error.message });
  }
};

// @desc    Process payroll and reset month
export const closeMonth = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const sourceAccount = await Account.findOne({ userId, accountType: 'Wallet' }) 
                        || await Account.findOne({ userId }); 

    if (!sourceAccount) {
      return res.status(400).json({ 
        message: "Financial Operation Denied: No linked account found for payroll." 
      });
    }

    const employees = await Employee.find({ user: userId });    
    if (!employees || employees.length === 0) {
      return res.status(404).json({ message: "No employees found to process." });
    }

    const totalPayroll = employees.reduce((sum, emp) => sum + (Number(emp.workingDays) * Number(emp.dailyRate)), 0);

    if (totalPayroll > 0) {
      if (sourceAccount.balance < totalPayroll) {
        return res.status(400).json({ 
          message: `Insufficient Funds: Needs ${totalPayroll}, but only ${sourceAccount.balance} available.` 
        });
      }

      await Transaction.create({
        userId: userId,
        fromAccount: sourceAccount._id, 
        toAccount: sourceAccount._id, 
        amount: totalPayroll,
        category: 'Salaries', 
        description: `Payroll: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        status: 'Completed',
        type: 'Expense'
      });

      sourceAccount.balance -= totalPayroll;
      await sourceAccount.save();
    }

    await Employee.updateMany(
      { user: userId }, 
      { $set: { workingDays: 0, lastAttendanceDate: null } }
    );

    res.json({ 
      success: true,
      message: `Payroll of ${totalPayroll.toLocaleString()} processed. Staff units reset.`,
      payout: totalPayroll
    });
  } catch (error) {
    res.status(500).json({ message: "Server error: " + error.message });
  }
};

// @desc    Permanently delete employee
export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee record permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};