const mongoose = require('mongoose');
const { faker } = require('@faker-js/faker/locale/zh_CN');
const City = require('../models/city.model');
require('dotenv').config();

// 广东省城市列表
const GUANGDONG_CITIES = [
  // 大城市
  { name: '广州', code: 'GZ', type: 'major' },
  { name: '深圳', code: 'SZ', type: 'major' },
  { name: '东莞', code: 'DG', type: 'major' },
  { name: '佛山', code: 'FS', type: 'major' },
  { name: '惠州', code: 'HZ', type: 'major' },
  { name: '中山', code: 'ZS', type: 'major' },
  { name: '珠海', code: 'ZH', type: 'major' },
  // 小城市
  { name: '江门', code: 'JM', type: 'small' },
  { name: '汕头', code: 'ST', type: 'small' },
  { name: '湛江', code: 'ZJ', type: 'small' },
  { name: '韶关', code: 'SG', type: 'small' },
  { name: '梅州', code: 'MZ', type: 'small' },
  { name: '河源', code: 'HY', type: 'small' },
  { name: '阳江', code: 'YJ', type: 'small' },
  { name: '茂名', code: 'MM', type: 'small' },
  { name: '肇庆', code: 'ZQ', type: 'small' },
  { name: '清远', code: 'QY', type: 'small' },
  { name: '潮州', code: 'CZ', type: 'small' },
  { name: '揭阳', code: 'JY', type: 'small' },
  { name: '云浮', code: 'YF', type: 'small' }
];

// 生成地铁站
function generateMetroStations(cityName, count) {
  const stations = [];
  const metroStations = [
    `${cityName}东站`, `${cityName}西站`, `${cityName}南站`, `${cityName}北站`,
    '中心城区', '体育中心', '大学城', '会展中心',
    '科技园', '市民中心', '文化广场', '商业区',
    '机场', '火车站', '汽车客运站'
  ];

  for (let i = 0; i < count; i++) {
    const baseName = faker.helpers.arrayElement(metroStations);
    const stationName = baseName.startsWith(cityName) ? `${baseName}地铁站` : `${cityName}${baseName}地铁站`;
    stations.push({
      name: stationName,
      type: '地铁站',
      address: faker.location.streetAddress(true),
      coordinates: {
        latitude: faker.location.latitude({ min: 20, max: 24, precision: 6 }),
        longitude: faker.location.longitude({ min: 110, max: 117, precision: 6 })
      },
      services: faker.helpers.arrayElements(
        ['ticket_office', 'waiting_room', 'luggage_storage', 'parking', 'restaurant'],
        faker.number.int({ min: 3, max: 5 })
      ),
      openingHours: '06:00-23:00',
      contactPhone: faker.phone.number('0###-########'),
      active: true
    });
  }
  return stations;
}

// 生成汽车站
function generateBusStations(cityName, count) {
  const stations = [];
  const busStations = [
    `${cityName}汽车客运站`,
    `${cityName}长途客运站`,
    `${cityName}客运中心`,
    `${cityName}汽车总站`,
    `${cityName}南部客运站`,
    `${cityName}北部客运站`
  ];

  for (let i = 0; i < count && i < busStations.length; i++) {
    stations.push({
      name: busStations[i],
      type: '汽车站',
      address: faker.location.streetAddress(true),
      coordinates: {
        latitude: faker.location.latitude({ min: 20, max: 24, precision: 6 }),
        longitude: faker.location.longitude({ min: 110, max: 117, precision: 6 })
      },
      services: faker.helpers.arrayElements(
        ['ticket_office', 'waiting_room', 'luggage_storage', 'parking', 'restaurant'],
        faker.number.int({ min: 3, max: 5 })
      ),
      openingHours: '05:30-22:00',
      contactPhone: faker.phone.number('0###-########'),
      active: true
    });
  }
  return stations;
}

// 生成乡镇站点
function generateTownStations(cityName, count) {
  const stations = [];
  const towns = [
    '城东镇', '城西镇', '城南镇', '城北镇', '新城镇', '老城镇',
    '工业园区', '开发区', '高新区', '经济开发区'
  ];

  for (let i = 0; i < count; i++) {
    const stationName = faker.helpers.arrayElement(towns);
    stations.push({
      name: `${stationName}汽车站`,
      type: '乡镇站',
      address: faker.location.streetAddress(true),
      coordinates: {
        latitude: faker.location.latitude({ min: 20, max: 24, precision: 6 }),
        longitude: faker.location.longitude({ min: 110, max: 117, precision: 6 })
      },
      services: faker.helpers.arrayElements(
        ['ticket_office', 'waiting_room', 'parking'],
        faker.number.int({ min: 2, max: 3 })
      ),
      openingHours: '06:00-20:00',
      contactPhone: faker.phone.number('0###-########'),
      active: true
    });
  }
  return stations;
}

// 生成城市统计数据
function generateCityStats() {
  return {
    searchCount: faker.number.int({ min: 100, max: 10000 }),
    bookingCount: faker.number.int({ min: 50, max: 5000 }),
    popularityScore: 0 // 将通过updateStats方法计算
  };
}

async function seedCities() {
  try {
    // 连接MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/BBbus');
    console.log('Connected to MongoDB');

    // 清除现有数据
    await City.deleteMany({});
    console.log('Cleared existing cities');

    // 生成所有城市数据
    const allCities = GUANGDONG_CITIES.map(city => {
      let stations = [];
      
      if (city.type === 'major') {
        // 大城市：4-5个汽车站，8-10个地铁站
        stations = [
          ...generateBusStations(city.name, faker.number.int({ min: 4, max: 5 })),
          ...generateMetroStations(city.name, faker.number.int({ min: 8, max: 10 }))
        ];
      } else {
        // 小城市：2-3个汽车站，4-5个乡镇站
        stations = [
          ...generateBusStations(city.name, faker.number.int({ min: 2, max: 3 })),
          ...generateTownStations(city.name, faker.number.int({ min: 4, max: 5 }))
        ];
      }

      return {
        ...city,
        cityType: city.type,
        province: '广东省',
        stations: stations,
        stats: generateCityStats(),
        active: true,
        createdAt: faker.date.past(),
        updatedAt: faker.date.recent()
      };
    });

    // 插入数据
    const cities = await City.insertMany(allCities);
    
    // 更新每个城市的热度分数
    for (const city of cities) {
      await city.updateStats('search');
    }
    
    console.log(`Seeded ${cities.length} cities successfully`);

    // 断开连接
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  } catch (error) {
    console.error('Error seeding cities:', error);
    process.exit(1);
  }
}

// 运行数据导入
seedCities();
