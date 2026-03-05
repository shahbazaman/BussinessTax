import Expense from '../models/Expense.js';

// @desc    Delete an expense
// @route   DELETE /api/expenses/:id
// @access  Private
export const deleteExpense = async (req, res) => {
  try {
    // Standardize finding the record with ownership check in one go
    const expense = await Expense.findOne({ 
      _id: req.params.id, 
      user: req.user._id 
    });

    if (!expense) {
      return res.status(404).json({ 
        message: 'Expense record not found or you are not authorized' 
      });
    }

    // If the expense was linked to an Account balance, 
    // you might want to add logic here later to "refund" the account.
    
    await expense.deleteOne();
    
    res.json({ 
      message: 'Expense and associated data purged successfully' 
    });
  } catch (error) {
    console.error("Delete Error:", error.message);
    
    if (error.kind === 'ObjectId') {
      return res.status(404).json({ message: 'Invalid ID format' });
    }
    
    res.status(500).json({ message: 'Server Error: Could not delete record' });
  }
};