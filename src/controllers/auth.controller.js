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
    console.log('Register request body:', req.body);
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
    res
      .status(500)
      .json({ message: '注册过程中发生错误', error: error.message });
  }
};

// 用户登录
exports.login = async (req, res) => {
  try {
    console.log('Login request body:', req.body);
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
    res
      .status(500)
      .json({ message: '登录过程中发生错误', error: error.message });
  }
};

// 获取当前用户信息
exports.getCurrentUser = async (req, res) => {
  try {
    console.log('Get current user request:', { userId: req.user._id });
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    res.json({
      success: true,
      data: {
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
    console.error('获取用户信息错误:', error);
    res.status(500).json({
      message: '获取用户信息时发生错误',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// 更新当前用户信息
exports.updateCurrentUser = async (req, res) => {
  try {
    console.log('Update current user request:', {
      userId: req.user._id,
      body: req.body,
    });

    const { email, phoneNumber, profile, preferences } = req.body;
    const userId = req.user._id;

    // 查找用户
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证邮箱唯一性
    if (email && email !== user.email) {
      const existingEmail = await User.findOne({ email });
      if (existingEmail) {
        return res.status(400).json({ message: '该邮箱已被使用' });
      }
      user.email = email;
    }

    // 验证手机号唯一性
    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const existingPhone = await User.findOne({ phoneNumber });
      if (existingPhone) {
        return res.status(400).json({ message: '该手机号已被使用' });
      }
      user.phoneNumber = phoneNumber;
    }

    // 更新个人资料
    if (profile) {
      // 只更新提供的字段
      Object.keys(profile).forEach(key => {
        if (profile[key] !== undefined) {
          user.profile[key] = profile[key];
        }
      });
    }

    // 更新偏好设置
    if (preferences) {
      // 确保 preferences 对象存在
      user.preferences = user.preferences || {};
      
      // 只更新提供的字段
      if (preferences.language !== undefined) {
        user.preferences.language = preferences.language;
      }
      if (preferences.currency !== undefined) {
        user.preferences.currency = preferences.currency;
      }
      if (preferences.timezone !== undefined) {
        user.preferences.timezone = preferences.timezone;
      }
      
      // 更新价格范围
      if (preferences.priceRange) {
        user.preferences.priceRange = user.preferences.priceRange || {};
        if (preferences.priceRange.min !== undefined) {
          user.preferences.priceRange.min = preferences.priceRange.min;
        }
        if (preferences.priceRange.max !== undefined) {
          user.preferences.priceRange.max = preferences.priceRange.max;
        }
      }
      
      // 更新首选功能
      if (preferences.preferredFeatures) {
        user.preferences.preferredFeatures = user.preferences.preferredFeatures || {};
        if (preferences.preferredFeatures.wifi !== undefined) {
          user.preferences.preferredFeatures.wifi = preferences.preferredFeatures.wifi;
        }
        if (preferences.preferredFeatures.toilet !== undefined) {
          user.preferences.preferredFeatures.toilet = preferences.preferredFeatures.toilet;
        }
        if (preferences.preferredFeatures.usbCharger !== undefined) {
          user.preferences.preferredFeatures.usbCharger = preferences.preferredFeatures.usbCharger;
        }
        if (preferences.preferredFeatures.airConditioner !== undefined) {
          user.preferences.preferredFeatures.airConditioner = preferences.preferredFeatures.airConditioner;
        }
      }
      
      // 更新首选巴士类型
      if (preferences.preferredBusTypes) {
        // 如果是数组，直接替换
        if (Array.isArray(preferences.preferredBusTypes)) {
          user.preferences.preferredBusTypes = preferences.preferredBusTypes;
        }
        // 如果是对象，处理数组操作
        else if (typeof preferences.preferredBusTypes === 'object') {
          user.preferences.preferredBusTypes = user.preferences.preferredBusTypes || [];
          if (preferences.preferredBusTypes.add) {
            // 添加新元素，避免重复
            const newItems = Array.isArray(preferences.preferredBusTypes.add) 
              ? preferences.preferredBusTypes.add 
              : [preferences.preferredBusTypes.add];
            newItems.forEach(item => {
              if (!user.preferences.preferredBusTypes.includes(item)) {
                user.preferences.preferredBusTypes.push(item);
              }
            });
          }
          if (preferences.preferredBusTypes.remove) {
            // 移除指定元素
            const removeItems = Array.isArray(preferences.preferredBusTypes.remove)
              ? preferences.preferredBusTypes.remove
              : [preferences.preferredBusTypes.remove];
            user.preferences.preferredBusTypes = user.preferences.preferredBusTypes.filter(
              item => !removeItems.includes(item)
            );
          }
        }
      }
      
      // 更新首选出发时间
      if (preferences.preferredDepartureTime) {
        // 如果是数组，直接替换
        if (Array.isArray(preferences.preferredDepartureTime)) {
          user.preferences.preferredDepartureTime = preferences.preferredDepartureTime;
        }
        // 如果是对象，处理数组操作
        else if (typeof preferences.preferredDepartureTime === 'object') {
          user.preferences.preferredDepartureTime = user.preferences.preferredDepartureTime || [];
          if (preferences.preferredDepartureTime.add) {
            // 添加新元素，避免重复
            const newItems = Array.isArray(preferences.preferredDepartureTime.add)
              ? preferences.preferredDepartureTime.add
              : [preferences.preferredDepartureTime.add];
            newItems.forEach(item => {
              if (!user.preferences.preferredDepartureTime.includes(item)) {
                user.preferences.preferredDepartureTime.push(item);
              }
            });
          }
          if (preferences.preferredDepartureTime.remove) {
            // 移除指定元素
            const removeItems = Array.isArray(preferences.preferredDepartureTime.remove)
              ? preferences.preferredDepartureTime.remove
              : [preferences.preferredDepartureTime.remove];
            user.preferences.preferredDepartureTime = user.preferences.preferredDepartureTime.filter(
              item => !removeItems.includes(item)
            );
          }
        }
      }
    }

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
          preferences: user.preferences,
        },
      },
    });
  } catch (error) {
    console.error('更新用户信息错误:', error);
    res.status(500).json({
      message: '更新用户信息时发生错误',
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
};

// 导出所有控制器函数
module.exports = {
  register: exports.register,
  login: exports.login,
  getCurrentUser: exports.getCurrentUser,
  updateCurrentUser: exports.updateCurrentUser,
};
