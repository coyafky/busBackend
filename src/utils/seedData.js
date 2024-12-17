const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Route = require('../models/route.model');
const User = require('../models/user.model');
const Order = require('../models/order.model');
const Recommendation = require('../models/recommendation.model');

// 连接数据库
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/BBbus')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// 读取路线数据
const loadRouteData = () => {
  const routeFiles = fs.readdirSync(path.join(__dirname, '../../../Data'))
    .filter(file => file.endsWith('.json'));
  
  const routes = [];
  
  routeFiles.forEach(file => {
    const filePath = path.join(__dirname, '../../../Data', file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // 提取城市信息
    const route = {
      routeId: 'RT' + Date.now() + Math.floor(Math.random() * 1000),
      start: data.start,
      end: data.end,
      status: data.status,
      departurePoints: data.departurePoints,
      arrivalPoints: data.arrivalPoints,
      weeklyScheduleOverview: {
        Monday: { schedules: [] },
        Tuesday: { schedules: [] },
        Wednesday: { schedules: [] },
        Thursday: { schedules: [] },
        Friday: { schedules: [] },
        Saturday: { schedules: [] },
        Sunday: { schedules: [] }
      },
      distance: Math.floor(Math.random() * 200) + 100, // 模拟距离
      duration: Math.floor(Math.random() * 120) + 60,  // 模拟时长
      rating: 4.5,
      ratingCount: 0,
      stats: {
        bookingCount: 0,
        viewCount: 0,
        completionRate: 0.95
      },
      active: true
    };

    // 处理每天的时刻表
    Object.entries(data.weeklyScheduleOverview).forEach(([day, dayData]) => {
      route.weeklyScheduleOverview[day].schedules = dayData.schedules.map(schedule => ({
        departureStartTime: schedule.departureStartTime,
        departureEndTime: schedule.departureEndTime,
        departurePoints: schedule.departurePoints,
        arrivalPoints: schedule.arrivalPoints,
        price: schedule.price,
        ticketType: schedule.ticketType,
        remarks: schedule.remarks,
        availableSeats: 45,
        busType: ['普通大巴', '豪华大巴', '高级大巴'][Math.floor(Math.random() * 3)],
        features: {
          hasWifi: Math.random() > 0.5,
          hasToilet: Math.random() > 0.7,
          hasUSBCharger: Math.random() > 0.3,
          hasAirConditioner: true
        }
      }));
    });

    routes.push(route);
  });
  
  return routes;
};

// 生成用户数据
const generateUsers = (count = 100) => {
  const users = [];
  
  for (let i = 0; i < count; i++) {
    const user = {
      userId: 'U' + Date.now() + i,
      username: `user${i + 1}`,
      email: `user${i + 1}@example.com`,
      phoneNumber: `1${Math.floor(Math.random() * 10)}${String(Math.random()).slice(2, 10)}`,
      password: 'password123', // 实际应用中需要加密
      profile: {
        nickname: `用户${i + 1}`,
        gender: ['male', 'female', 'other'][Math.floor(Math.random() * 3)],
        birthday: new Date(1970 + Math.floor(Math.random() * 40), 
                         Math.floor(Math.random() * 12),
                         Math.floor(Math.random() * 28))
      },
      preferences: {
        preferredBusTypes: ['普通大巴', '豪华大巴', '高级大巴'].filter(() => Math.random() > 0.5),
        preferredDepartureTime: ['morning', 'afternoon', 'evening'].filter(() => Math.random() > 0.5),
        priceRange: {
          min: Math.floor(Math.random() * 50),
          max: Math.floor(Math.random() * 200) + 100
        },
        preferredFeatures: {
          wifi: Math.random() > 0.5,
          toilet: Math.random() > 0.5,
          usbCharger: Math.random() > 0.5,
          airConditioner: true
        }
      },
      behavior: {
        searchHistory: [],
        viewHistory: [],
        bookingHistory: []
      },
      interestVector: Array(50).fill(0).map(() => Math.random()),
      favorites: [],
      status: 'active'
    };
    users.push(user);
  }
  
  return users;
};

// 生成订单数据
const generateOrders = (users, routes, count = 200) => {
  const orders = [];
  const statuses = ['pending', 'paid', 'completed', 'cancelled', 'refunded'];
  
  for (let i = 0; i < count; i++) {
    const user = users[Math.floor(Math.random() * users.length)];
    const route = routes[Math.floor(Math.random() * routes.length)];
    const status = statuses[Math.floor(Math.random() * statuses.length)];
    
    // 随机选择一天和一个班次
    const days = Object.keys(route.weeklyScheduleOverview);
    const day = days[Math.floor(Math.random() * days.length)];
    const schedule = route.weeklyScheduleOverview[day].schedules[0];
    
    if (!schedule) continue;

    const departurePoint = schedule.departurePoints[0];
    const arrivalPoint = schedule.arrivalPoints[0];
    
    const order = {
      orderId: 'ORD' + Date.now() + i,
      userId: user._id,
      routeId: route._id,
      status,
      orderInfo: {
        orderNumber: `ON${Date.now()}${i}`,
        price: schedule.price,
        passengerCount: Math.floor(Math.random() * 3) + 1,
        departurePoint: {
          name: departurePoint.name,
          departureTime: departurePoint.departureTime
        },
        arrivalPoint,
        scheduleDate: new Date()
      },
      passengers: [{
        name: user.profile.nickname,
        idType: '身份证',
        idNumber: String(Math.random()).slice(2, 20),
        phone: user.phoneNumber,
        insurance: {
          purchased: Math.random() > 0.5,
          type: '基础保险',
          price: 20
        }
      }]
    };

    if (status !== 'pending') {
      order.payment = {
        method: ['alipay', 'wechat', 'creditCard'][Math.floor(Math.random() * 3)],
        transactionId: `TXN${Date.now()}${i}`,
        paidAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        amount: order.orderInfo.price
      };
    }

    if (status === 'completed' && Math.random() > 0.3) {
      order.review = {
        rating: Math.floor(Math.random() * 5) + 1,
        comment: '服务很好，准时到达',
        createdAt: new Date()
      };
    }

    orders.push(order);
  }
  
  return orders;
};

// 生成推荐数据
const generateRecommendations = (users, routes) => {
  return users.map(user => ({
    userId: user._id,
    collaborativeRecommendations: Array(5).fill(0).map(() => ({
      routeId: routes[Math.floor(Math.random() * routes.length)]._id,
      score: Math.random(),
      reason: '根据您的历史订单推荐'
    })),
    contentBasedRecommendations: Array(5).fill(0).map(() => ({
      routeId: routes[Math.floor(Math.random() * routes.length)]._id,
      score: Math.random(),
      reason: '根据您的偏好推荐'
    })),
    popularRecommendations: Array(5).fill(0).map(() => ({
      routeId: routes[Math.floor(Math.random() * routes.length)]._id,
      score: Math.random(),
      reason: '热门路线推荐'
    })),
    lastUpdated: new Date()
  }));
};

// 主函数
const main = async () => {
  try {
    // 清空现有数据
    await Promise.all([
      Route.deleteMany({}),
      User.deleteMany({}),
      Order.deleteMany({}),
      Recommendation.deleteMany({})
    ]);
    
    console.log('开始生成数据...');
    
    // 生成并保存路线数据
    const routes = await Route.insertMany(loadRouteData());
    console.log(`已生成 ${routes.length} 条路线数据`);
    
    // 生成并保存用户数据
    const users = await User.insertMany(generateUsers());
    console.log(`已生成 ${users.length} 个用户数据`);
    
    // 生成并保存订单数据
    const orders = await Order.insertMany(generateOrders(users, routes));
    console.log(`已生成 ${orders.length} 条订单数据`);
    
    // 生成并保存推荐数据
    const recommendations = await Recommendation.insertMany(generateRecommendations(users, routes));
    console.log(`已生成 ${recommendations.length} 条推荐数据`);
    
    console.log('数据生成完成！');
    process.exit(0);
  } catch (error) {
    console.error('数据生成失败：', error);
    process.exit(1);
  }
};

main();
