/**
 * Test script to verify weather API is using real OpenWeather data
 */

const axios = require('axios');

async function testWeatherAPI() {
  console.log('🌤️  Testing JAMALERT Weather API Integration\n');
  console.log('=' .repeat(60));
  
  const cities = [
    'Kingston,JM',
    'Montego Bay,JM',
    'Spanish Town,JM'
  ];
  
  for (const city of cities) {
    console.log(`\n📍 Testing weather for: ${city}`);
    console.log('-'.repeat(60));
    
    try {
      // Test current weather
      const response = await axios.get(`http://localhost:8000/api/weather`, {
        params: {
          city: city,
          type: 'current'
        }
      });
      
      const { success, data, cached, mock } = response.data;
      
      console.log(`✅ API Response: ${success ? 'SUCCESS' : 'FAILED'}`);
      console.log(`📦 Using Mock Data: ${mock ? 'YES' : 'NO'}`);
      console.log(`💾 From Cache: ${cached ? 'YES' : 'NO'}`);
      
      if (data) {
        console.log(`\n🌡️  Temperature: ${data.temperature}°C (Feels like: ${data.feelsLike}°C)`);
        console.log(`💧 Humidity: ${data.humidity}%`);
        console.log(`🌧️  Condition: ${data.condition} - ${data.description}`);
        console.log(`💨 Wind: ${data.windSpeed} m/s at ${data.windDegree}°`);
        console.log(`☁️  Cloudiness: ${data.cloudiness}%`);
        console.log(`🔍 Visibility: ${data.visibility}m`);
        console.log(`📊 Pressure: ${data.pressure} hPa`);
        
        const timestamp = new Date(data.timestamp * 1000);
        console.log(`⏰ Data Timestamp: ${timestamp.toLocaleString()}`);
        
        // Check if data is recent (within last hour)
        const ageMinutes = (Date.now() - timestamp.getTime()) / (1000 * 60);
        console.log(`📅 Data Age: ${ageMinutes.toFixed(1)} minutes`);
        
        if (ageMinutes > 60) {
          console.log(`⚠️  WARNING: Data is older than 1 hour!`);
        } else {
          console.log(`✅ Data is fresh (less than 1 hour old)`);
        }
      }
      
    } catch (error) {
      console.error(`❌ Error testing ${city}:`, error.message);
      if (error.response) {
        console.error(`   Status: ${error.response.status}`);
        console.error(`   Data:`, error.response.data);
      }
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('🏁 Weather API Test Complete\n');
}

// Run the test
testWeatherAPI().catch(console.error);

