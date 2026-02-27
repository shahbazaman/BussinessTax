import Employee from '../models/Employee.js';
import Transaction from '../models/Transaction.js';
export const getEmployees = async (req, res) => {
  try {
    const employees = await Employee.find({ user: req.user.id });
    res.json(employees);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const addEmployee = async (req, res) => {
  const { name, role, dailyRate } = req.body;
  try {
    const employee = await Employee.create({
      user: req.user.id,
      name,
      role,
      dailyRate
    });
    res.status(201).json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
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
  const employees = await Employee.find({ user: req.user.id });
  const totalPayroll = employees.reduce((sum, emp) => sum + (emp.workingDays * emp.dailyRate), 0);
  await Transaction.create({
    user: req.user.id,
    type: 'expense',
    category: 'Salary',
    amount: totalPayroll,
    description: `Monthly Payroll for ${new Date().toLocaleString('default', { month: 'long' })}`
  });
  await Employee.updateMany({ user: req.user.id }, { $set: { workingDays: 0 } });
  res.json({ message: "Payroll processed and recorded in Accounts." });
};
export const updateAttendance = async (req, res) => {
  try {
    const employee = await Employee.findById(req.params.id);
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
    res.status(400).json({ message: "Update failed" });
  }
};
export const updateEmployee = async (req, res) => {
  try {
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      req.body,
      { returnDocument: 'after' }
    );
    if (!employee) return res.status(404).json({ message: "Employee not found" });
    res.json(employee);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};