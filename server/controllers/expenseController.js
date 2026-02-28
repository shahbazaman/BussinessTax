import Expense from '../models/Expense.js';
export const deleteExpense = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id);
    if (!expense) {
      return res.status(404).json({ message: 'Expense record not found' });
    }
    if (expense.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: 'User not authorized to delete this record' });
    }
    await expense.deleteOne();
    res.json({ message: 'Expense deleted successfully' });
  } catch (error) {
    console.error("Delete Error:", error.message);
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Invalid ID format' });
    }
    res.status(500).json({ message: 'Server Error' });
  }
};