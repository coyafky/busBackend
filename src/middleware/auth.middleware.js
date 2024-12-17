const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config');
const User = require('../models/user.model');

const verifyToken = async (req, res, next) => {
  const token = req.headers['x-access-token'] || req.headers['authorization'];

  if (!token) {
    return res.status(403).json({
      message: '未提供访问令牌'
    });
  }

  try {
    const decoded = jwt.verify(token.replace('Bearer ', ''), authConfig.jwtSecret);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        message: '用户不存在'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      message: '无效的访问令牌'
    });
  }
};

module.exports = {
  verifyToken
};
