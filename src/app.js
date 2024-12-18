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
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
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
  console.log('Request Headers:', req.headers);
  console.log('Request Body:', req.body);
  next();
});

// 添加根路由处理
app.get('/', (req, res) => {
  res.json({
    message: 'BBbus API is running',
    environment: process.env.NODE_ENV,
    routes: {
      auth: '/api/auth',
      users: '/api/users',
      routes: '/api/routes',
      bookings: '/api/bookings',
      cities: '/api/cities',
    },
  });
});

// 添加基础测试路由
app.get('/test', (req, res) => {
  res.json({ message: 'Root test endpoint is working!' });
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API test endpoint is working!' });
});

// 添加认证测试路由
app.get('/api/auth/test', (req, res) => {
  res.json({
    message: 'Auth route is working!',
    timestamp: new Date().toISOString(),
  });
});

// 路由注册前添加调试信息
console.log('Registering routes...');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/cities', cityRoutes);

// 添加路由测试端点
app.get('/api/routes-test', (req, res) => {
  const routes = app._router.stack
    .filter(r => r.route || (r.name === 'router' && r.handle.stack))
    .map(r => {
      if (r.route) {
        return {
          path: r.route.path,
          methods: Object.keys(r.route.methods)
        };
      }
      return {
        name: r.name,
        regexp: r.regexp.toString(),
        path: r.regexp.toString().replace('/^\\', '').replace('\\/?(?=\\/|$)/i', '')
      };
    });

  res.json({
    message: 'Routes test',
    routes: routes,
    registeredRoutes: {
      auth: app._router.stack.some(r => r.regexp && r.regexp.test('/api/auth')),
      users: app._router.stack.some(r => r.regexp && r.regexp.test('/api/users')),
      routes: app._router.stack.some(r => r.regexp && r.regexp.test('/api/routes')),
      bookings: app._router.stack.some(r => r.regexp && r.regexp.test('/api/bookings')),
      cities: app._router.stack.some(r => r.regexp && r.regexp.test('/api/cities'))
    }
  });
});

// 404处理
app.use((req, res, next) => {
  console.log('404 Not Found:', {
    method: req.method,
    path: req.path,
    body: req.body,
    headers: req.headers
  });
  res.status(404).json({
    message: '接口不存在',
    requestedPath: req.path,
    method: req.method
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  res.status(500).json({
    message: '服务器内部错误',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    path: req.path,
    method: req.method
  });
});

// MongoDB connection with retry mechanism
const connectWithRetry = async () => {
  const maxRetries = 5;
  const retryInterval = 5000; // 5 seconds
  let currentRetry = 0;

  while (currentRetry < maxRetries) {
    try {
      const mongoUri = process.env.MONGODB_URI;
      if (!mongoUri) {
        throw new Error('MONGODB_URI environment variable is not set');
      }

      await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log('Successfully connected to MongoDB');
      return;
    } catch (err) {
      currentRetry += 1;
      console.error(
        `MongoDB connection attempt ${currentRetry} failed:`,
        err.message
      );

      if (currentRetry === maxRetries) {
        console.error('Max retries reached. Could not connect to MongoDB');
        throw err; // 让错误继续传播，而不是直接退出进程
      }

      console.log(`Retrying in ${retryInterval / 1000} seconds...`);
      await new Promise((resolve) => setTimeout(resolve, retryInterval));
    }
  }
};

// Initialize MongoDB connection
connectWithRetry().catch((err) => {
  console.error('Failed to establish initial connection to MongoDB:', err);
  // 不要立即退出进程，让应用继续运行，这样至少可以返回错误信息
  // process.exit(1);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
