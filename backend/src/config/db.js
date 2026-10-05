const mongoose = require('mongoose');
const config = require('./index');

function sanitizeMongoUri(uri) {
  if (!uri) return '';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri);
    console.log(`[db] connected to MongoDB at ${sanitizeMongoUri(config.mongoUri)}`);
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    // Fail loudly and stop the process rather than serving requests with no DB.
    process.exit(1);
  }
}

module.exports = connectDB;
