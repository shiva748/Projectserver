const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, 'data');
const dataFilePath = path.join(dataDir, 'data.json');

const defaultData = {
  base_rates: {
    Micro: { Oneway: 10, Roundtrip: 9 },
    Sedan: { Oneway: 12, Roundtrip: 11 },
    SUV: { Oneway: 15, Roundtrip: 14 },
    MUV: { Oneway: 18, Roundtrip: 17 }
  },
  average_multipliers: { Micro: 1, Sedan: 1, SUV: 1, MUV: 1 }
};

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

function loadData() {
  if (!fs.existsSync(dataFilePath)) {
    saveData(defaultData);
    return defaultData;
  }
  const data = fs.readFileSync(dataFilePath, 'utf8');
  return JSON.parse(data);
}

function saveData(data) {
  fs.writeFileSync(dataFilePath, JSON.stringify(data, null, 2), 'utf8');
}

function updateMultiplier(cabCategory, newMultiplier) {
  const data = loadData();
  data.average_multipliers[cabCategory] = 
    ((data.average_multipliers[cabCategory] * 999) + newMultiplier) / 1000;
  saveData(data);
}

function recordTrip(cabCategory, tripType, distance, fare) {
  const data = loadData();
  const baseRate = data.base_rates[cabCategory][tripType];
  const newMultiplier = fare / (distance * baseRate);

  updateMultiplier(cabCategory, newMultiplier);
}

function calculateMinimumFare(cabCategory, tripType, distance) {
  const data = loadData();
  const baseRate = data.base_rates[cabCategory][tripType];
  const averageMultiplier = data.average_multipliers[cabCategory];
  return baseRate * distance * averageMultiplier;
}

function getCurrentRates() {
  const data = loadData();
  const rates = {};
  for (const category of Object.keys(data.base_rates)) {
    rates[category] = {
      Oneway: data.base_rates[category].Oneway * data.average_multipliers[category],
      Roundtrip: data.base_rates[category].Roundtrip * data.average_multipliers[category]
    };
  }
  return rates;
}

module.exports = {
  loadData,
  saveData,
  updateMultiplier,
  recordTrip,
  calculateMinimumFare,
  getCurrentRates
};
