const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker/locale/zh_CN');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Route = require('../models/route.model');
require('dotenv').config();

// 生成用户ID
function generateUserId() {
  return `U${faker.string.alphanumeric(8).toUpperCase()}`;
}

// 生成唯一用户名
function generateUniqueUsername() {
  const prefix = faker.internet.userName().toLowerCase().replace(/[^a-z0-9]/g, '');
  const suffix = faker.string.alphanumeric(6);
  return `${prefix}_${suffix}`;
}

// 生成兴趣向量
function generateInterestVector() {
  return Array.from({ length: 10 }, () => faker.number.float({ min: 0, max: 1, precision: 0.01 }));
}

// 生成用户偏好
function generatePreferences() {
  return {
    preferredBusTypes: faker.helpers.arrayElements(
      ['普通大巴', '豪华大巴', '高级大巴'],
      faker.number.int({ min: 1, max: 3 })
    ),
    preferredDepartureTime: faker.helpers.arrayElements(
      ['早上', '下午', '晚上'],
      faker.number.int({ min: 1, max: 3 })
    ),
    priceRange: {
      min: faker.number.int({ min: 50, max: 100 }),
      max: faker.number.int({ min: 200, max: 300 })
    },
    preferredFeatures: {
      wifi: faker.datatype.boolean(),
      toilet: faker.datatype.boolean(),
      usbCharger: faker.datatype.boolean(),
      airConditioner: faker.datatype.boolean()
    },
    frequentCities: Array.from({ length: faker.number.int({ min: 2, max: 4 }) }, () => ({
      city: faker.helpers.arrayElement(['广州', '深圳', '东莞', '佛山', '惠州', '中山', '珠海']),
      frequency: faker.number.int({ min: 1, max: 10 })
    }))
  };
}

// 生成行为数据
async function generateBehavior() {
  const routes = await Route.find().select('_id');
  const cities = ['广州', '深圳', '东莞', '佛山', '惠州', '中山', '珠海'];
  
  return {
    searchHistory: Array.from({ length: faker.number.int({ min: 5, max: 15 }) }, () => ({
      fromCity: faker.helpers.arrayElement(cities),
      toCity: faker.helpers.arrayElement(cities),
      timestamp: faker.date.past({ years: 1 })
    })),
    viewHistory: Array.from({ length: faker.number.int({ min: 10, max: 30 }) }, () => ({
      routeId: faker.helpers.arrayElement(routes)._id,
      timestamp: faker.date.past({ years: 1 })
    })),
    bookingHistory: [] // 将在订单生成时填充
  };
}

// 生成收藏路线
async function generateFavorites() {
  const routes = await Route.find().select('_id');
  return Array.from({ length: faker.number.int({ min: 0, max: 5 }) }, () => ({
    routeId: faker.helpers.arrayElement(routes)._id,
    addedAt: faker.date.past({ years: 1 }),
    notes: faker.helpers.arrayElement(['常用路线', '价格实惠', '服务好', '准时发车']),
    alerts: {
      priceThreshold: faker.number.int({ min: 50, max: 200 }),
      enabled: faker.datatype.boolean()
    }
  }));
}

async function seedUsers() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/BBbus');
    console.log('Connected to MongoDB');

    // 清除现有用户数据
    await User.deleteMany({});
    console.log('Cleared existing users');

    // 创建管理员用户
    const adminPassword = await bcrypt.hash('123456', 10);
    const adminUser = new User({
      userId: 'UADMIN001',
      username: 'admin',
      email: 'admin@example.com',
      password: adminPassword,
      phoneNumber: '13800138000',
      profile: {
        nickname: '系统管理员',
        gender: 'other',
        birthday: new Date('1990-01-01'),
        avatar: 'https://example.com/avatar/admin.jpg'
      },
      preferences: generatePreferences(),
      behavior: await generateBehavior(),
      interestVector: generateInterestVector(),
      favorites: await generateFavorites(),
      status: 'active',
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    });
    await adminUser.save();
    console.log('Created admin user');

    // 生成普通用户
    const userCount = 2000; // 增加到2000个用户
    const batchSize = 200; // 每批处理200个用户
    let processedCount = 0;

    while (processedCount < userCount) {
      const batchCount = Math.min(batchSize, userCount - processedCount);
      const users = [];
      
      for (let i = 0; i < batchCount; i++) {
        const password = await bcrypt.hash(faker.internet.password(), 10);
        users.push({
          userId: generateUserId(),
          username: generateUniqueUsername(),
          email: faker.internet.email(),
          password: password,
          phoneNumber: faker.phone.number('1##########'),
          profile: {
            nickname: faker.person.firstName(),
            gender: faker.helpers.arrayElement(['male', 'female', 'other']),
            birthday: faker.date.birthdate({ min: 18, max: 65, mode: 'age' }),
            avatar: faker.image.avatar()
          },
          preferences: generatePreferences(),
          behavior: await generateBehavior(),
          interestVector: generateInterestVector(),
          favorites: await generateFavorites(),
          status: 'active',
          lastLoginAt: faker.date.recent(),
          createdAt: faker.date.past(),
          updatedAt: faker.date.recent()
        });
      }

      await User.insertMany(users);
      processedCount += batchCount;
      console.log(`Created ${processedCount} regular users`);
    }

    console.log(`Total users created: ${processedCount + 1}`); // +1 for admin

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding users:', error);
    process.exit(1);
  }
}

// 运行数据导入
seedUsers();
