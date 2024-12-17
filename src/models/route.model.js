const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  departureStartTime: String,
  departureEndTime: String,
  departurePoints: [{
    name: String,
    departureTime: String
  }],
  arrivalPoints: [String],
  price: Number,
  remarks: String,
  availableSeats: {
    type: Number,
    default: 45
  },
  busType: {
    type: String,
    default: '普通大巴'
  },
  features: {
    hasWifi: Boolean,
    hasToilet: Boolean,
    hasUSBCharger: Boolean,
    hasAirConditioner: Boolean
  }
});

const weeklyScheduleSchema = new mongoose.Schema({
  Monday: { schedules: [scheduleSchema] },
  Tuesday: { schedules: [scheduleSchema] },
  Wednesday: { schedules: [scheduleSchema] },
  Thursday: { schedules: [scheduleSchema] },
  Friday: { schedules: [scheduleSchema] },
  Saturday: { schedules: [scheduleSchema] },
  Sunday: { schedules: [scheduleSchema] }
});

const routeSchema = new mongoose.Schema({
  routeId: {
    type: String,
    required: true,
    unique: true
  },
  start: {
    type: String,
    required: true
  },
  end: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['有班次', '无班次'],
    default: '有班次'
  },
  departurePoints: [String],
  arrivalPoints: [String],
  weeklyScheduleOverview: weeklyScheduleSchema,
  distance: Number,
  duration: Number,
  rating: {
    type: Number,
    default: 4.5
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  stats: {
    bookingCount: {
      type: Number,
      default: 0
    },
    viewCount: {
      type: Number,
      default: 0
    },
    completionRate: {
      type: Number,
      default: 0.95
    }
  },
  featureVector: [Number],
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

const Route = mongoose.model('Route', routeSchema);

module.exports = Route;
