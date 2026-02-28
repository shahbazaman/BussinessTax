import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import invoiceRoutes from './routes/invoiceRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import clientRoutes from './routes/clientRoutes.js';
import dashboardRoutes from './routes/dashboardRoutes.js';
import accountRoutes from './routes/accountRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js'; 
import employeeRoutes from './routes/employeeRoutes.js';
import productRoutes from './routes/productRoutes.js';
import transactionRoutes from './routes/transactionRoutes.js';

dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL, // This will be your Vercel URL
  credentials: true
}));
app.use(express.json()); 

app.use('/api/payments', paymentRoutes); 
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/invoices', invoiceRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/products', productRoutes); // For the upcoming Inventory feature
app.use('/api/transactions', transactionRoutes);
app.get('/', (req, res) => {
  res.send('BusinessTax API is running...');
});
app.get('/health', (req, res) => res.status(200).send('Server is running'));
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});
try {
  const rates = await fetchRates();
} catch (error) {
  console.log("Rate API down, using static fallback (1 USD = 1)");
  // fallback logic
}