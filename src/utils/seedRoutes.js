const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker/locale/zh_CN');
const Route = require('../models/route.model');
const City = require('../models/city.model');
require('dotenv').config();

// 大城市列表
const MAJOR_CITIES = ['广州', '深圳', '东莞', '佛山', '惠州', '中山', '珠海'];

// 生成路线ID
function generateRouteId(start, end) {
  return `R${start}${end}${faker.number.int({ min: 100, max: 999 })}`;
}

// 为小城市生成乡镇站点
function generateTownStops(cityName, count) {
  const towns = [
    '${cityName}东站', '${cityName}西站', '${cityName}南站', '${cityName}北站',
    '城东镇', '城西镇', '城南镇', '城北镇', '新城镇', '老城镇',
    '工业园区', '开发区', '高新区', '经济开发区'
  ];
  return faker.helpers.arrayElements(
    towns, count
  ).map(town => 
    town.replace('${cityName}', cityName)
  );
}

// 为大城市生成地铁站和汽车站点
function generateMetroStops(cityName, count) {
  const metroStations = [
    '${cityName}东站地铁站', '${cityName}西站地铁站', '${cityName}南站地铁站', '${cityName}北站地铁站',
    '中心城区地铁站', '体育中心地铁站', '大学城地铁站', '会展中心地铁站',
    '科技园地铁站', '市民中心地铁站', '文化广场地铁站', '商业区地铁站',
    '机场地铁站', '火车站地铁站', '汽车客运站'
  ];
  return faker.helpers.arrayElements(metroStations, count).map(station => 
    station.replace('${cityName}', cityName)
  );
}

// 生成发车时间 - 根据路线类型
function generateDepartureTime(routeType) {
  let hour;
  switch (routeType) {
    case 'small-to-small': // 小城市到小城市：早上6-9点
      hour = faker.number.int({ min: 6, max: 9 });
      break;
    case 'small-to-major': // 小城市到大城市：早上6-9点或晚上18-21点
      hour = faker.helpers.arrayElement([
        faker.number.int({ min: 6, max: 9 }),
        faker.number.int({ min: 18, max: 21 })
      ]);
      break;
    case 'major-to-major': // 大城市之间：全天6-22点
      hour = faker.number.int({ min: 6, max: 22 });
      break;
    default:
      hour = faker.number.int({ min: 6, max: 22 });
  }
  const minute = faker.helpers.arrayElement(['00', '30']);
  return `${hour.toString().padStart(2, '0')}:${minute}`;
}

// 生成介于两个时间之间的随机时间
function generateTimeBetween(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const [endHour, endMinute] = endTime.split(':').map(Number);
  
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;
  
  const randomMinutes = faker.number.int({ min: startMinutes, max: endMinutes });
  const hour = Math.floor(randomMinutes / 60);
  const minute = randomMinutes % 60;
  
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

// 生成单个班次数据
function generateSchedule(departurePoints, arrivalPoints, routeType) {
  const departureTime = generateDepartureTime(routeType);
  const [hour, minute] = departureTime.split(':');
  const endHour = (parseInt(hour) + 1).toString().padStart(2, '0');
  const endTime = `${endHour}:${minute}`;
  
  return {
    departureStartTime: departureTime,
    departureEndTime: endTime,
    departurePoints: departurePoints.map(point => ({
      name: point,
      departureTime: generateTimeBetween(departureTime, endTime)
    })),
    arrivalPoints: arrivalPoints,
    price: faker.number.int({ min: 50, max: 300 }),
    remarks: faker.helpers.arrayElement(['准点发车', '过路站点停靠', '直达快线']),
    availableSeats: faker.number.int({ min: 20, max: 45 }),
    busType: faker.helpers.arrayElement(['普通大巴', '豪华大巴', '高级大巴']),
    features: {
      hasWifi: faker.datatype.boolean(),
      hasToilet: faker.datatype.boolean(),
      hasUSBCharger: faker.datatype.boolean(),
      hasAirConditioner: true
    }
  };
}

// 生成每周时刻表
function generateWeeklySchedule(departurePoints, arrivalPoints, routeType) {
  const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const weeklySchedule = {};

  // 根据路线类型决定每天的班次数
  let scheduleCount;
  switch (routeType) {
    case 'small-to-small': // 小城市间：2条
      scheduleCount = 2;
      break;
    case 'small-to-major': // 小城市到大城市：3-4条
      scheduleCount = faker.number.int({ min: 3, max: 4 });
      break;
    case 'major-to-major': // 大城市间：8-10条
      scheduleCount = faker.number.int({ min: 8, max: 10 });
      break;
    default:
      scheduleCount = faker.number.int({ min: 2, max: 4 });
  }

  weekDays.forEach(day => {
    weeklySchedule[day] = {
      schedules: Array.from({ length: scheduleCount }, () => 
        generateSchedule(departurePoints, arrivalPoints, routeType)
      )
    };
  });

  return weeklySchedule;
}

// 生成路线特征向量
function generateFeatureVector() {
  return Array.from({ length: 10 }, () => faker.number.float({ min: 0, max: 1, precision: 0.01 }));
}

// 生成路线统计数据
function generateRouteStats() {
  return {
    bookingCount: faker.number.int({ min: 100, max: 5000 }),
    viewCount: faker.number.int({ min: 500, max: 10000 }),
    completionRate: faker.number.float({ min: 0.9, max: 1, precision: 0.01 })
  };
}

async function seedRoutes() {
  try {
    // 连接MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/BBbus');
    console.log('Connected to MongoDB');

    // 清除现有路线数据
    await Route.deleteMany({});
    console.log('Cleared existing routes');

    // 获取所有城市
    const cities = await City.find({});
    const routes = [];

    // 处理每个城市对
    for (let i = 0; i < cities.length; i++) {
      const startCity = cities[i];
      const isStartCityMajor = MAJOR_CITIES.includes(startCity.name);
      
      for (let j = 0; j < cities.length; j++) {
        if (i === j) continue;
        
        const endCity = cities[j];
        const isEndCityMajor = MAJOR_CITIES.includes(endCity.name);

        // 确定路线类型和是否创建路线
        let routeType;
        let shouldCreateRoute = true;

        if (isStartCityMajor && isEndCityMajor) {
          routeType = 'major-to-major';
        } else if (!isStartCityMajor && !isEndCityMajor) {
          routeType = 'small-to-small';
          // 粤西到粤东的小城市无班次
          if ((startCity.name.includes('湛') || startCity.name.includes('茂') || startCity.name.includes('阳')) &&
              (endCity.name.includes('潮') || endCity.name.includes('揭') || endCity.name.includes('汕'))) {
            shouldCreateRoute = false;
          }
        } else {
          routeType = 'small-to-major';
        }

        if (shouldCreateRoute) {
          // 生成站点
          const departurePoints = isStartCityMajor 
            ? generateMetroStops(startCity.name, faker.number.int({ min: 10, max: 15 }))
            : generateTownStops(startCity.name, faker.number.int({ min: 6, max: 8 }));

          const arrivalPoints = isEndCityMajor
            ? generateMetroStops(endCity.name, faker.number.int({ min: 10, max: 15 }))
            : generateTownStops(endCity.name, faker.number.int({ min: 6, max: 8 }));

          // 生成路线数据
          const route = {
            routeId: generateRouteId(startCity.code, endCity.code),
            start: startCity.name,
            end: endCity.name,
            status: '有班次',
            departurePoints: departurePoints,
            arrivalPoints: arrivalPoints,
            weeklyScheduleOverview: generateWeeklySchedule(departurePoints, arrivalPoints, routeType),
            distance: faker.number.int({ min: 50, max: 1000 }),
            duration: faker.number.int({ min: 60, max: 480 }),
            rating: faker.number.float({ min: 4.0, max: 5.0, precision: 0.1 }),
            ratingCount: faker.number.int({ min: 10, max: 1000 }),
            stats: generateRouteStats(),
            featureVector: generateFeatureVector(),
            active: true,
            createdAt: faker.date.past(),
            updatedAt: faker.date.recent()
          };

          routes.push(route);
        }
      }
    }

    // 批量插入路线数据
    const insertedRoutes = await Route.insertMany(routes);
    console.log(`Seeded ${insertedRoutes.length} routes successfully`);

    // 断开连接
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding routes:', error);
    process.exit(1);
  }
}

// 运行数据导入
seedRoutes();
