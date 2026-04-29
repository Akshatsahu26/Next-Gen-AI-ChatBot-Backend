const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config({ override: true });

const connectDB = require('./config/db');
const transactionRoutes = require('./routes/transactionRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const authRoutes = require('./src/routes/auth.route');
const loanRoutes = require('./src/routes/loan.route');
const chatRoutes = require('./src/routes/chat.route');
const ttsRoutes = require('./src/routes/tts.route');
const actionRoutes = require('./src/routes/action.route');
const bankingRoutes = require('./src/routes/banking.route');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Bank Seva backend is running' });
});

app.use('/api', transactionRoutes);
app.use('/api', authRoutes);
app.use('/api/loan', loanRoutes);
app.use('/api', chatRoutes);
app.use('/api/tts', ttsRoutes);
app.use('/api/complaint', complaintRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/action', actionRoutes);
app.use('/api/banking', bankingRoutes);

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.originalUrl}`,
  });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  });
});

const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
