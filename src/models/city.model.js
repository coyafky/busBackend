const mongoose = require('mongoose');

const stationSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['汽车站', '地铁站', '乡镇站'],
    required: true
  },
  address: String,
  coordinates: {
    latitude: Number,
    longitude: Number
  },
  services: [{
    type: String,
    enum: ['ticket_office', 'waiting_room', 'luggage_storage', 'parking', 'restaurant']
  }],
  openingHours: String,
  contactPhone: String,
  active: {
    type: Boolean,
    default: true
  }
});

const citySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    index: true // 添加索引以优化搜索
  },
  code: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  province: {
    type: String,
    required: true,
    index: true
  },
  cityType: {
    type: String,
    enum: ['major', 'small'],
    required: true
  },
  stations: [stationSchema],
  stats: {
    searchCount: {
      type: Number,
      default: 0
    },
    bookingCount: {
      type: Number,
      default: 0
    },
    popularityScore: {
      type: Number,
      default: 0
    }
  },
  metadata: {
    population: Number,
    gdp: Number,
    timezone: String,
    weatherCode: String
  },
  active: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// 添加文本索引以支持模糊搜索
citySchema.index({ name: 'text', 'stations.name': 'text' });

// 更新时自动更新updatedAt字段
citySchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// 虚拟字段：获取活跃车站数量
citySchema.virtual('activeStationsCount').get(function() {
  return this.stations.filter(station => station.active).length;
});

// 更新城市统计信息的方法
citySchema.methods.updateStats = async function(type) {
  if (type === 'search') {
    this.stats.searchCount += 1;
  } else if (type === 'booking') {
    this.stats.bookingCount += 1;
  }
  
  // 计算热度分数
  this.stats.popularityScore = (this.stats.searchCount * 0.3 + this.stats.bookingCount * 0.7) / 100;
  
  await this.save();
};

const City = mongoose.model('City', citySchema);

module.exports = City;
