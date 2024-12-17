const express = require('express');
const router = express.Router();
const Order = require('../models/order.model');
const Route = require('../models/route.model');
const { verifyToken } = require('../middleware/auth.middleware');

// 创建订单
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      routeId,
      departurePoint,
      departureTime,
      arrivalPoint,
      scheduleDate,
      passengers,
      insurance
    } = req.body;

    // 检查路线是否存在
    const route = await Route.findOne({ routeId });
    if (!route) {
      return res.status(404).json({ message: '路线不存在' });
    }

    // 获取对应日期的时刻表
    const dayOfWeek = new Date(scheduleDate).toLocaleDateString('en-US', { weekday: 'long' });
    const daySchedules = route.weeklyScheduleOverview[dayOfWeek].schedules;
    
    // 查找匹配的班次
    const schedule = daySchedules.find(s => 
      s.departurePoints.some(p => p.name === departurePoint && p.departureTime === departureTime) &&
      s.arrivalPoints.includes(arrivalPoint)
    );

    if (!schedule) {
      return res.status(404).json({ message: '未找到匹配的班次' });
    }

    // 检查座位是否足够
    if (schedule.availableSeats < passengers.length) {
      return res.status(400).json({ message: '座位数量不足' });
    }

    // 计算总价
    const basePrice = schedule.price * passengers.length;
    const insurancePrice = insurance ? (20 * passengers.length) : 0;
    const totalPrice = basePrice + insurancePrice;

    // 创建订单
    const order = new Order({
      orderId: 'ORD' + Date.now() + Math.floor(Math.random() * 1000),
      userId: req.user._id,
      routeId: route._id,
      orderInfo: {
        orderNumber: 'ON' + Date.now() + Math.floor(Math.random() * 1000),
        price: totalPrice,
        passengerCount: passengers.length,
        departurePoint: {
          name: departurePoint,
          departureTime
        },
        arrivalPoint,
        scheduleDate: new Date(scheduleDate)
      },
      passengers: passengers.map(p => ({
        ...p,
        insurance: insurance ? {
          purchased: true,
          type: '基础保险',
          price: 20
        } : {
          purchased: false
        }
      }))
    });

    // 更新座位数量和统计信息
    schedule.availableSeats -= passengers.length;
    route.stats.bookingCount += 1;
    await Promise.all([
      order.save(),
      route.save()
    ]);

    // 更新用户行为记录
    req.user.behavior.bookingHistory.push({
      orderId: order._id,
      timestamp: new Date()
    });
    await req.user.save();

    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// 获取订单详情
router.get('/:orderId', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      orderId: req.params.orderId,
      userId: req.user._id
    }).populate('routeId');
    
    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取用户订单历史
router.get('/history', verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .populate('routeId');
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 取消订单
router.post('/:orderId/cancel', verifyToken, async (req, res) => {
  try {
    const order = await Order.findOne({
      orderId: req.params.orderId,
      userId: req.user._id
    });

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (order.status !== 'pending' && order.status !== 'paid') {
      return res.status(400).json({ message: '订单状态不允许取消' });
    }

    // 更新订单状态
    order.status = 'cancelled';
    
    // 如果已支付，记录退款信息
    if (order.status === 'paid') {
      order.payment.refundAmount = order.payment.amount;
      order.payment.refundReason = req.body.reason || '用户取消';
      order.payment.refundedAt = new Date();
    }

    // 恢复座位数量
    const route = await Route.findById(order.routeId);
    if (route) {
      const dayOfWeek = order.orderInfo.scheduleDate.toLocaleDateString('en-US', { weekday: 'long' });
      const schedule = route.weeklyScheduleOverview[dayOfWeek].schedules.find(s => 
        s.departurePoints.some(p => 
          p.name === order.orderInfo.departurePoint.name && 
          p.departureTime === order.orderInfo.departurePoint.departureTime
        )
      );

      if (schedule) {
        schedule.availableSeats += order.orderInfo.passengerCount;
        await route.save();
      }
    }

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 添加订单评价
router.post('/:orderId/review', verifyToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const order = await Order.findOne({
      orderId: req.params.orderId,
      userId: req.user._id
    });

    if (!order) {
      return res.status(404).json({ message: '订单不存在' });
    }

    if (order.status !== 'completed') {
      return res.status(400).json({ message: '只能评价已完成的订单' });
    }

    if (order.review) {
      return res.status(400).json({ message: '订单已评价' });
    }

    order.review = {
      rating,
      comment,
      createdAt: new Date()
    };

    // 更新路线评分
    const route = await Route.findById(order.routeId);
    if (route) {
      const totalRating = route.rating * route.ratingCount;
      route.ratingCount += 1;
      route.rating = (totalRating + rating) / route.ratingCount;
      await route.save();
    }

    await order.save();
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
