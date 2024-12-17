const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// 输出当前目录结构
console.log('Current directory:', __dirname);
console.log('Routes directory:', path.join(__dirname, 'routes'));

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const routeRoutes = require('./routes/route.routes');
const bookingRoutes = require('./routes/booking.routes');
const cityRoutes = require('./routes/city.routes');

const app = express();

// 允许所有跨域请求
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
    ],
  })
);

// 静态文件服务
app.use(express.static(path.join(__dirname, 'public')));

// 请求体解析
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text());
app.use(express.raw());

// 通用响应头设置
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
  res.header(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, Content-Length, X-Requested-With'
  );

  // 处理 OPTIONS 请求
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// 添加请求日志中间件
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cities', cityRoutes);

// 404处理
app.use((req, res, next) => {
  res.status(404).json({
    message: '接口不存在',
  });
});

// MongoDB connection with retry mechanism
const connectWithRetry = async () => {
  const maxRetries = 5;
  const retryInterval = 5000; // 5 seconds
  let currentRetry = 0;

  while (currentRetry < maxRetries) {
    try {
      await mongoose.connect(
        process.env.MONGODB_URI || 'mongodb://localhost:27017/BBbus',
        {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        }
      );
      console.log('Successfully connected to MongoDB');
      return;
    } catch (err) {
      currentRetry++;
      console.error(
        `MongoDB connection attempt ${currentRetry} failed:`,
        err.message
      );
      if (currentRetry === maxRetries) {
        console.error('Max retries reached. Could not connect to MongoDB');
        process.exit(1);
      }
      console.log(`Retrying in ${retryInterval / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
  }
};

// Initialize MongoDB connection
connectWithRetry().catch((err) => {
  console.error('Failed to establish initial connection to MongoDB:', err);
  process.exit(1);
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
