import Employee from '../models/Employee.js';
import Transaction from '../models/Transaction.js';
import Account from '../models/Account.js';
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ user: req.user.id });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addEmployee = async (req, res) => {
  const { 
    name, email, phone, role, dailyRate, 
    contactNumber, homeAddress, verificationIdType, idNumber, 
    bankName, accountNumber 
  } = req.body;
  const employee = new Employee({
    user: req.user._id,
    name, email, phone, role, dailyRate,
    contactNumber, homeAddress, verificationIdType, idNumber,
    bankDetails: { bankName, accountNumber }
  });
  await employee.save();
  res.status(201).json(employee);
};

export const deleteEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json({ message: "Employee removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const closeMonth = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const sourceAccount = await Account.findOne({ userId, accountType: 'Wallet' }) 
                        || await Account.findOne({ userId }); 
    if (!sourceAccount) {
      return res.status(400).json({ 
        message: "Financial Operation Denied: No source account found. Please link a bank account or wallet first." 
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
          message: `Insufficient Funds: Payroll requires ${totalPayroll.toLocaleString()}, but ${sourceAccount.bankName} only has ${sourceAccount.balance.toLocaleString()}.` 
        });
      }
      await Transaction.create({
        userId: userId,
        fromAccount: sourceAccount._id, 
        toAccount: sourceAccount._id, 
        amount: totalPayroll,
        category: 'Salaries', 
        description: `Payroll Settlement: ${new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}`,
        status: 'Completed',
        type: 'Expense'
      });
      sourceAccount.balance -= totalPayroll;
      await sourceAccount.save();
    }
    await Employee.updateMany(
      { user: userId }, 
      { 
        $set: { 
          workingDays: 0,
          lastAttendanceDate: null 
        } 
      }
    );
    res.json({ 
      success: true,
      message: `Payroll of ${totalPayroll.toLocaleString()} processed from ${sourceAccount.bankName}. Staff units reset.`,
      payout: totalPayroll
    });

  } catch (error) {
    console.error("Close Month Error:", error);
    res.status(500).json({ 
      message: "Server error: " + error.message 
    });
  }
};

export const updateAttendance = async (req, res) => {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, user: req.user.id });
    if (!employee) return res.status(404).json({ message: "Employee not found" });

    const today = new Date().setHours(0, 0, 0, 0);
    const lastDate = employee.lastAttendanceDate ? new Date(employee.lastAttendanceDate).setHours(0, 0, 0, 0) : null;

    if (lastDate === today) {
      return res.status(400).json({ message: "Attendance already marked for today" });
    }

    employee.workingDays += 1;
    employee.lastAttendanceDate = new Date();
    await employee.save();

    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: "Update failed: " + error.message });
  }
};

export const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { new: true } 
    );
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};