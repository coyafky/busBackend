const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user.model');
const authConfig = require('../config/auth.config');

// 生成用户ID
function generateUserId() {
  // 生成6位随机数字
  const random = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, '0');
  return `USER_${random}`;
}

// 注册新用户
exports.register = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 参数验证
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码都是必需的' });
    }

    // 检查用户名是否已存在
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ message: '用户名已存在' });
    }

    // 创建新用户
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      userId: generateUserId(),
      username,
      password: hashedPassword,
      profile: {
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
        nickname: username,
      },
    });

    await user.save();

    // 生成 token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiration }
    );

    res.status(201).json({
      success: true,
      message: '注册成功',
      data: {
        token,
        user: {
          id: user._id,
          userId: user.userId,
          username: user.username,
          profile: user.profile,
        },
      },
    });
  } catch (error) {
    console.error('注册错误:', error);
    res.status(500).json({ message: '注册过程中发生错误' });
  }
};

// 用户登录
exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // 参数验证
    if (!username || !password) {
      return res.status(400).json({ message: '用户名和密码都是必需的' });
    }

    // 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ message: '用户名或密码错误' });
    }

    // 检查用户状态
    if (user.status !== 'active') {
      return res.status(403).json({ message: '账号已被禁用' });
    }

    // 生成 token
    const token = jwt.sign(
      { id: user._id, username: user.username },
      authConfig.jwtSecret,
      { expiresIn: authConfig.jwtExpiration }
    );

    // 更新最后登录时间
    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user._id,
          userId: user.userId,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          profile: user.profile,
          preferences: user.preferences,
        },
      },
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({ message: '登录过程中发生错误' });
  }
};

// 获取当前用户信息
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        message: '用户不存在',
      });
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          userId: user._id,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          profile: user.profile,
          preferences: user.preferences,
        },
      },
    });
  } catch (error) {
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      message: '获取用户信息失败',
    });
  }
};

// 更新用户资料
exports.updateProfile = async (req, res) => {
  try {
    const { email, phoneNumber, nickname } = req.body;
    const userId = req.user._id;

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 更新用户资料
    if (email) user.email = email;
    if (phoneNumber) user.phoneNumber = phoneNumber;
    if (nickname) user.profile.nickname = nickname;

    // 保存更改
    await user.save();

    res.json({
      success: true,
      message: '个人信息更新成功',
      data: {
        user: {
          id: user._id,
          userId: user.userId,
          username: user.username,
          email: user.email,
          phoneNumber: user.phoneNumber,
          profile: user.profile,
        },
      },
    });
  } catch (error) {
    console.error('更新个人信息错误:', error);
    res.status(500).json({ message: '更新个人信息时发生错误' });
  }
};

// 导出所有控制器函数
module.exports = {
  register: exports.register,
  login: exports.login,
  getCurrentUser: exports.getCurrentUser,
  updateProfile: exports.updateProfile,
};
