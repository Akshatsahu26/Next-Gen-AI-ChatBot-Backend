/* eslint-disable no-console */
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/user.model');

dotenv.config({ path: '.env' });

const dummyUsers = [
  {
    name: 'Akash Sharma',
    email: 'akash@bankseva.com',
    phone: '9876543210',
    password: 'Pass@123',
    pin: '1234',
    accountNumber: '1234567801',
    balance: 125000,
  },
  {
    name: 'Riya Verma',
    email: 'riya@bankseva.com',
    phone: '9123456780',
    password: 'Secure@456',
    pin: '5678',
    accountNumber: '1234567802',
    balance: 84500,
  },
];

const seedUsers = async () => {
  try {
    await connectDB();

    const usersToInsert = await Promise.all(
      dummyUsers.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10),
        pin: await bcrypt.hash(user.pin, 10),
      }))
    );

    await User.deleteMany({
      email: { $in: dummyUsers.map((user) => user.email) },
    });

    await User.insertMany(usersToInsert);

    console.log('Dummy users seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding users:', error.message);
    process.exit(1);
  }
};

seedUsers();
