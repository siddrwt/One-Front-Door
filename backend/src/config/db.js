const mongoose = require('mongoose');
const config = require('./index');

function sanitizeMongoUri(uri) {
  if (!uri) return '';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
}

async function connectDB() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 2000 });
    console.log(`[db] connected to MongoDB at ${sanitizeMongoUri(config.mongoUri)}`);
  } catch (err) {
    console.warn('[db] connection failed:', err.message);
    console.log('[db] Falling back to mongodb-memory-server...');
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log(`[db] connected to IN-MEMORY MongoDB at ${uri}`);
    config.mongoUri = uri; // Update for other scripts
  }
}

module.exports = connectDB;
