// Test if functions can load without crashing
process.env.DATABASE_URL = process.env.DATABASE_URL || 'mysql://local-placeholder-url';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'local-secret-placeholder';
process.env.SMTP_HOST = process.env.SMTP_HOST || 'smtp.placeholder.local';
process.env.SMTP_USER = process.env.SMTP_USER || 'placeholder-user';
process.env.SMTP_PASS = process.env.SMTP_PASS || 'placeholder-pass';
process.env.WEATHER_API_KEY = process.env.WEATHER_API_KEY || 'placeholder-weather-key';
process.env.NODE_ENV = 'development';

console.log('Loading functions...');
try {
    require('./dist/src/index.js');
    console.log('\n✅ SUCCESS: Functions loaded without errors!');
    console.log('The Azure Functions v4 module loaded successfully.');
    process.exit(0);
} catch (error) {
    console.error('\n❌ ERROR: Failed to load functions');
    console.error(error);
    process.exit(1);
}
