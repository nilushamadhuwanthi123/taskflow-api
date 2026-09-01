const mongoose = require('mongoose');

/**
 * Connects to MongoDB using the given URI (or MONGO_URI from the
 * environment). Kept separate from server startup so tests can point it
 * at an in-memory MongoDB instance instead of a real database.
 */
async function connectDB(uri = process.env.MONGO_URI) {
  if (!uri) {
    throw new Error('MONGO_URI is not defined');
  }

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri);

  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
