const mongoose = require('mongoose');
const dns = require('dns');

// Force Google DNS pour résoudre les enregistrements SRV MongoDB Atlas
// Contourne les box/routeurs qui ne supportent pas les requêtes SRV
dns.setServers(['8.8.8.8', '8.8.4.4']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI);
    console.log(`MongoDB connecté : ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur MongoDB : ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
