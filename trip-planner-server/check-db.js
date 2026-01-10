const mongoose = require('mongoose');
require('dotenv').config();

const checkDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to database:', mongoose.connection.name);
    console.log('Connection string points to:', process.env.MONGODB_URI);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    mongoose.disconnect();
  }
};

checkDB();