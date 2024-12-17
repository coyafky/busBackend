const express = require('express');
const router = express.Router();
const Route = require('../models/route.model');
const auth = require('../middleware/auth');

// 获取所有可用城市
router.get('/cities', async (req, res) => {
  try {
    const routes = await Route.find({ active: true });
    const cities = new Set();
    routes.forEach(route => {
      cities.add(route.start);
      cities.add(route.end);
    });
    res.json(Array.from(cities));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取路线的所有站点
router.get('/stations', async (req, res) => {
  try {
    const { start, end } = req.query;
    const route = await Route.findOne({ start, end, active: true });
    if (!route) {
      return res.status(404).json({ message: '未找到路线' });
    }
    res.json({
      departurePoints: route.departurePoints,
      arrivalPoints: route.arrivalPoints
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 搜索路线
router.get('/search', async (req, res) => {
  try {
    const { start, end, date, departurePoint, arrivalPoint } = req.query;
    
    const query = {
      start,
      end,
      active: true,
      status: '有班次'
    };

    const route = await Route.findOne(query);
    if (!route) {
      return res.status(404).json({ message: '未找到路线' });
    }

    // 获取指定日期的时刻表
    const dayOfWeek = new Date(date).toLocaleDateString('en-US', { weekday: 'long' });
    let schedules = route.weeklyScheduleOverview[dayOfWeek].schedules;

    // 根据上下车点筛选
    if (departurePoint) {
      schedules = schedules.filter(schedule => 
        schedule.departurePoints.some(point => point.name === departurePoint)
      );
    }
    if (arrivalPoint) {
      schedules = schedules.filter(schedule => 
        schedule.arrivalPoints.includes(arrivalPoint)
      );
    }

    // 更新路线统计信息
    route.stats.viewCount += 1;
    await route.save();

    res.json({
      routeId: route.routeId,
      start: route.start,
      end: route.end,
      schedules,
      distance: route.distance,
      duration: route.duration,
      rating: route.rating,
      ratingCount: route.ratingCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取热门路线
router.get('/popular', async (req, res) => {
  try {
    const routes = await Route.find({ active: true, status: '有班次' })
      .sort({ 'stats.bookingCount': -1 })
      .limit(6);
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取路线详情
router.get('/:routeId', async (req, res) => {
  try {
    const route = await Route.findOne({ routeId: req.params.routeId, active: true });
    if (!route) {
      return res.status(404).json({ message: '路线不存在' });
    }
    
    // 更新查看次数
    route.stats.viewCount += 1;
    await route.save();

    res.json(route);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 收藏路线
router.post('/:routeId/favorite', auth, async (req, res) => {
  try {
    const route = await Route.findOne({ routeId: req.params.routeId, active: true });
    if (!route) {
      return res.status(404).json({ message: '路线不存在' });
    }

    const exists = req.user.favorites.some(fav => fav.routeId.equals(route._id));
    if (exists) {
      return res.status(400).json({ message: '已经收藏过此路线' });
    }

    req.user.favorites.push({
      routeId: route._id,
      addedAt: new Date(),
      alerts: {
        priceThreshold: req.body.priceThreshold,
        enabled: req.body.enableAlert
      }
    });

    await req.user.save();
    res.json({ message: '收藏成功' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 获取用户收藏的路线
router.get('/favorites', auth, async (req, res) => {
  try {
    const user = await req.user.populate('favorites.routeId');
    res.json(user.favorites);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
