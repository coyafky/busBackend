const express = require('express');
const router = express.Router();
const path = require('path');

// 输出控制器路径
console.log('Controller path:', path.resolve(__dirname, '../controllers/auth.controller.js'));

const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// 测试路由
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth route is working!',
    timestamp: new Date().toISOString()
  });
});

// 注册新用户
router.post('/register', (req, res, next) => {
  console.log('Register route hit');
  console.log('Request body:', req.body);
  authController.register(req, res, next);
});

// 用户登录
router.post('/login', (req, res, next) => {
  console.log('Login route hit');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  authController.login(req, res, next);
});

// 获取当前用户信息（需要认证）
router.get('/me', verifyToken, authController.getCurrentUser);

// 更新个人信息（需要认证）
router.put('/profile', verifyToken, authController.updateProfile);

// 导出路由器之前打印所有注册的路由
console.log('Registered auth routes:', 
  router.stack.map(r => ({
    path: r.route.path,
    methods: Object.keys(r.route.methods)
  }))
);

module.exports = router;
