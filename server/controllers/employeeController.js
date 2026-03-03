import Employee from '../models/Employee.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';

export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ user: req.user._id });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addEmployee = async (req, res) => {
  try {
    const { 
      name, email, phone, role, dailyRate, 
      contactNumber, homeAddress, verificationIdType, idNumber, 
      bankDetails 
    } = req.body;

    const employee = new Employee({
      user: req.user._id,
      name, email, phone, role, dailyRate,
      contactNumber, homeAddress, verificationIdType, idNumber,
      bankDetails
    });
    
    await employee.save();
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ message: "Creation failed: " + error.message });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, user: req.user._id });
    if (!employee) return res.status(404).json({ message: "Employee record not found" });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastDate = employee.lastAttendanceDate ? new Date(employee.lastAttendanceDate) : null;
    if (lastDate) lastDate.setHours(0, 0, 0, 0);

    // Strict date comparison to prevent double-marking
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

export const closeMonth = async (req, res) => {
  try {
    const userId = req.user._id;
    
    // Find account to deduct from
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

    // Calculate total payout
    const totalPayroll = employees.reduce((sum, emp) => sum + (Number(emp.workingDays) * Number(emp.dailyRate)), 0);

    if (totalPayroll > 0) {
      if (sourceAccount.balance < totalPayroll) {
        return res.status(400).json({ 
          message: `Insufficient Funds: Needs ${totalPayroll}, but only ${sourceAccount.balance} available.` 
        });
      }

      // Create expense transaction
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

    // Reset all employee units for the new month
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

export const updateEmployee = async (req, res) => {
  try {
    // We use req.user._id to ensure the user owns this record
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: req.body }, // Using $set is safer for partial updates
      { new: true, runValidators: true } 
    );

    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: "Update failed: " + error.message });
  }
};

export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee record permanently deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};