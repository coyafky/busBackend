const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  userId: {
    type: String,
    unique: true,
    default: () =>
      'USER_' + Math.random().toString(36).substr(2, 9).toUpperCase(),
  },
  username: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  phoneNumber: {
    type: String,
    required: false,
    unique: true,
    sparse: true,
  },
  profile: {
    nickname: String,
    gender: {
      type: String,
      enum: ['male', 'female', 'other'],
    },
    birthday: Date,
    avatar: String,
  },
  preferences: {
    language: {
      type: String,
      default: 'zh_CN',
    },
    currency: {
      type: String,
      default: 'CNY',
    },
    timezone: {
      type: String,
      default: 'Asia/Shanghai',
    },
    preferredBusTypes: {
      type: [String],
      required: false,
    },
    preferredDepartureTime: {
      type: [String],
      required: false,
    },
    priceRange: {
      min: {
        type: Number,
        required: false,
      },
      max: {
        type: Number,
        required: false,
      },
    },
    preferredFeatures: {
      wifi: {
        type: Boolean,
        required: false,
      },
      toilet: {
        type: Boolean,
        required: false,
      },
      usbCharger: {
        type: Boolean,
        required: false,
      },
      airConditioner: {
        type: Boolean,
        required: false,
      },
    },
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended'],
    default: 'active',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  passwordLastChanged: {
    type: Date,
    default: Date.now,
  },
});

// 更新时间中间件
userSchema.pre('save', function (next) {
  // 更新时间戳
  this.updatedAt = Date.now();

  // 如果密码被修改了，更新密码修改时间
  if (this.isModified('password')) {
    this.passwordLastChanged = Date.now();
  }

  next();
});

// 密码比对方法
userSchema.methods.comparePassword = async function (password) {
  try {
    console.log('Comparing passwords:', {
      provided: password,
      stored: this.password,
    });
    const isMatch = await bcrypt.compare(password, this.password);
    console.log('Password match result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('Error comparing passwords:', error);
    return false;
  }
};

const User = mongoose.model('User', userSchema);

module.exports = User;
