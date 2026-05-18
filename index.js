const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(morgan('dev'));
const allowedOrigins = [
  'http://localhost:5173',
  'https://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://loankp-production.up.railway.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    
    // Check if origin is in the allowed list or is a localhost port
    if (allowedOrigins.includes(origin) || origin.startsWith('http://localhost:')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin']
}));
app.use(express.json());

// Routes
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const hrRoutes = require('./routes/hrRoutes');
const creditRoutes = require('./routes/creditRoutes');
const recoveryRoutes = require('./routes/recoveryRoutes');
const financeRoutes = require('./routes/financeRoutes');
const managementRoutes = require('./routes/managementRoutes');
const profileRoutes = require('./routes/profileRoutes');
const loanRoutes = require('./routes/loanRoutes');
const investorRoutes = require('./routes/investorRoutes');
const employeeRoutes = require('./routes/employeeRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/hr', hrRoutes);
app.use('/api/credit', creditRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/finance', financeRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/investor', investorRoutes);
app.use('/api/employee', employeeRoutes);

// Health Check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date() });
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
