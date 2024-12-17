const express = require('express');
const router = express.Router();
const path = require('path');

// 输出控制器路径
console.log('Controller path:', path.resolve(__dirname, '../controllers/auth.controller.js'));

const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middleware/auth.middleware');

// 测试路由
router.get('/test', (req, res) => {
  res.json({ message: 'Auth route is working' });
});

// 注册新用户
router.post('/register', (req, res, next) => {
  console.log('Register route hit');
  console.log('Request body:', req.body);
  authController.register(req, res, next);
});

// 用户登录
router.post('/login', authController.login);

// 获取当前用户信息（需要认证）
router.get('/me', verifyToken, authController.getCurrentUser);

// 更新个人信息（需要认证）
router.put('/profile', verifyToken, authController.updateProfile);

module.exports = router;
