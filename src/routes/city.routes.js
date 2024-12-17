const express = require('express');
const router = express.Router();
const City = require('../models/city.model');

// Get all cities
router.get('/', async (req, res) => {
  try {
    const cities = await City.find({ active: true }).select('name code province');
    res.json(cities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get popular cities (currently based on active status)
router.get('/popular', async (req, res) => {
  try {
    const popularCities = await City.find({ active: true })
      .select('name code province')
      .limit(10);
    res.json(popularCities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Search cities by name
router.get('/search', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    const cities = await City.find({
      name: { $regex: query, $options: 'i' },
      active: true
    }).select('name code province');
    res.json(cities);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get city details by code
router.get('/:code', async (req, res) => {
  try {
    const city = await City.findOne({ 
      code: req.params.code,
      active: true 
    });
    
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    
    res.json(city);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get city stations
router.get('/:code/stations', async (req, res) => {
  try {
    const city = await City.findOne({ 
      code: req.params.code,
      active: true 
    }).select('stations');
    
    if (!city) {
      return res.status(404).json({ message: 'City not found' });
    }
    
    const activeStations = city.stations.filter(station => station.active);
    res.json(activeStations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
