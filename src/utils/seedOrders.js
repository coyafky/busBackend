const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker/locale/zh_CN');
const Order = require('../models/order.model');
const User = require('../models/user.model');
const Route = require('../models/route.model');
require('dotenv').config();

// 生成订单ID
function generateOrderId() {
  return `O${faker.string.alphanumeric(10).toUpperCase()}`;
}

// 生成订单号
function generateOrderNumber() {
  const timestamp = Date.now().toString();
  const random = faker.string.numeric(12); // 增加到12位随机数
  const microseconds = process.hrtime()[1].toString().slice(0, 6); // 添加微秒级时间戳
  return `BB${timestamp}${microseconds}${random}`;
}

// 生成乘客信息
function generatePassenger() {
  const lastName = faker.person.lastName();
  const firstName = faker.person.firstName();
  return {
    name: `${lastName}${firstName}`,
    idType: '身份证',
    idNumber: faker.string.numeric(18),
    phone: faker.phone.number('1##########'),
    insurance: {
      purchased: faker.datatype.boolean(),
      type: faker.helpers.arrayElement(['基础保险', '延误保险', '综合保险']),
      price: faker.number.int({ min: 10, max: 50 })
    }
  };
}

// 生成订单评价
function generateReview() {
  if (faker.datatype.boolean(0.8)) { // 80%的概率有评价
    return {
      rating: faker.number.int({ min: 3, max: 5 }), // 大多数评价是好评
      comment: faker.helpers.arrayElement([
        '准时发车，服务态度好',
        '车况不错，司机开车很稳',
        '空调温度适宜，座位舒适',
        '整体体验不错，会继续选择',
        '站点设施完善，候车区域干净',
        '购票方便，行程顺利',
        '性价比高，推荐乘坐'
      ]),
      createdAt: faker.date.recent({ days: 7 })
    };
  }
  return null;
}

async function seedOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/BBbus');
    console.log('Connected to MongoDB');

    // 清除现有订单数据
    await Order.deleteMany({});
    console.log('Cleared existing orders');

    // 获取所有用户和路线
    const users = await User.find().select('_id');
    const routes = await Route.find().select('_id');
    const totalOrders = 10000; // 生成10000个订单
    const batchSize = 500;
    let processedCount = 0;

    while (processedCount < totalOrders) {
      const batchCount = Math.min(batchSize, totalOrders - processedCount);
      const orders = [];

      for (let i = 0; i < batchCount; i++) {
        const orderDate = faker.date.past({ years: 1 });
        const user = faker.helpers.arrayElement(users);
        const route = faker.helpers.arrayElement(routes);
        const passengerCount = faker.number.int({ min: 1, max: 4 });
        const basePrice = faker.number.int({ min: 50, max: 300 });
        
        // 生成乘客信息
        const passengers = Array.from({ length: passengerCount }, () => generatePassenger());
        
        // 计算总价（包含保险）
        const totalInsurancePrice = passengers.reduce((sum, p) => 
          sum + (p.insurance.purchased ? p.insurance.price : 0), 0);
        const totalPrice = (basePrice * passengerCount) + totalInsurancePrice;

        // 生成订单状态和支付信息
        const orderStatus = faker.helpers.arrayElement(['completed', 'completed', 'completed', 'cancelled', 'refunded']); // 大多数是已完成
        const paymentMethod = faker.helpers.arrayElement(['alipay', 'wechat', 'creditCard']);
        const paidAt = orderStatus !== 'cancelled' ? faker.date.between({ from: orderDate, to: new Date() }) : null;

        // 创建订单对象
        const order = {
          orderId: generateOrderId(),
          userId: user._id,
          routeId: route._id,
          status: orderStatus,
          orderInfo: {
            orderNumber: generateOrderNumber(),
            price: totalPrice,
            passengerCount: passengerCount,
            departurePoint: {
              name: faker.helpers.arrayElement(['汽车站', '地铁站', '乡镇站']),
              departureTime: faker.date.future().toISOString()
            },
            arrivalPoint: faker.helpers.arrayElement(['汽车站', '地铁站', '乡镇站']),
            scheduleDate: faker.date.future()
          },
          passengers: passengers,
          payment: {
            method: paymentMethod,
            transactionId: faker.string.alphanumeric(20),
            paidAt: paidAt,
            amount: totalPrice,
            refundAmount: orderStatus === 'refunded' ? totalPrice : null,
            refundReason: orderStatus === 'refunded' ? faker.helpers.arrayElement([
              '行程变更',
              '临时有事',
              '天气原因',
              '车辆故障'
            ]) : null,
            refundedAt: orderStatus === 'refunded' ? faker.date.between({ from: paidAt, to: new Date() }) : null
          },
          review: orderStatus === 'completed' ? generateReview() : null,
          createdAt: orderDate,
          updatedAt: faker.date.between({ from: orderDate, to: new Date() })
        };

        orders.push(order);
      }

      await Order.insertMany(orders);
      processedCount += batchCount;
      console.log(`Created ${processedCount} orders`);
    }

    // 更新用户的订单历史
    const orders = await Order.find().select('_id userId');
    const userOrderMap = new Map();
    
    orders.forEach(order => {
      if (!userOrderMap.has(order.userId.toString())) {
        userOrderMap.set(order.userId.toString(), []);
      }
      userOrderMap.get(order.userId.toString()).push({
        orderId: order._id,
        timestamp: order.createdAt
      });
    });

    for (const [userId, orderHistory] of userOrderMap) {
      await User.findByIdAndUpdate(userId, {
        'behavior.bookingHistory': orderHistory
      });
    }
    
    console.log('Updated user booking history');

    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding orders:', error);
    process.exit(1);
  }
}

// 运行数据导入
seedOrders();
