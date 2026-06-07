require('dotenv').config();

const express = require('express');
const mysql = require('mysql2/promise');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const cors = require('cors');

const app = express();

app.use(cors({
  origin: [
    'https://book-my-tour-co1m.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:5500'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(express.json());
app.use(express.static(__dirname));

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

async function initDB() {
  try {
    const conn = await pool.getConnection();

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        firstName VARCHAR(100) NOT NULL,
        lastName VARCHAR(100),
        email VARCHAR(255) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId INT NOT NULL,
        hotelName VARCHAR(255),
        amount DECIMAL(10,2),
        paymentId VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ MySQL Connected and tables ready');
    conn.release();
  } catch (err) {
    console.error('❌ DB Init Error:', err.message);
  }
}

initDB();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'dummy',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy'
});

const createToken = (user) => {
  return jwt.sign(
    {
      userId: user.id,
      firstName: user.firstName
    },
    process.env.JWT_SECRET || 'super_secret_fallback_key_123456789',
    { expiresIn: '1d' }
  );
};

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token missing' });
  }

  jwt.verify(
    token,
    process.env.JWT_SECRET || 'super_secret_fallback_key_123456789',
    (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });
      req.user = user;
      next();
    }
  );
};

app.get('/', (req, res) => {
  res.send('Backend running ✅');
});

app.get('/api/test-db', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 AS connected');
    res.json({ success: true, result: rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/signup', async (req, res) => {
  try {
    let { firstName, lastName, email, password, name, fullName, username } = req.body;

    firstName = firstName || name || fullName || username;
    lastName = lastName || '';

    if (!firstName || !email || !password) {
      return res.status(400).json({
        error: 'firstName, email, password required',
        received: req.body
      });
    }

    email = email.toLowerCase().trim();

    const [existing] = await pool.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await pool.execute(
      'INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)',
      [firstName, lastName, email, hashedPassword]
    );

    res.status(201).json({
      message: 'Signup successful',
      userId: result.insertId
    });

  } catch (err) {
    console.error('❌ Signup Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  console.log('--- LOGIN HIT ---');
  console.log('BODY:', req.body);

  try {
    let { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email/password missing', body: req.body });
    }

    email = email.trim().toLowerCase();

    console.log('EMAIL:', email);

    const [rows] = await pool.execute(
      'SELECT id, firstName, email, password FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    console.log('ROWS FOUND:', rows.length);

    if (rows.length === 0) {
      return res.status(401).json({ error: 'User not found. Signup first.' });
    }

    const user = rows[0];

    console.log('USER FROM DB:', user);

    if (!user.password) {
      return res.status(500).json({ error: 'Password column empty in database' });
    }

    const isMatch = await bcrypt.compare(String(password), String(user.password));

    if (!isMatch) {
      return res.status(401).json({ error: 'Wrong password' });
    }

    const token = jwt.sign(
      { userId: user.id, firstName: user.firstName },
      process.env.JWT_SECRET || 'super_secret_fallback_key',
      { expiresIn: '1d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      firstName: user.firstName,
      userId: user.id
    });

  } catch (err) {
    console.error('FULL LOGIN ERROR:', err);

    return res.status(500).json({
      error: err.message || err.code || JSON.stringify(err) || 'Unknown backend error'
    });
  }
});
app.get('/api/get-key', (req, res) => {
  res.json({ key: process.env.RAZORPAY_KEY_ID });
});
app.get('/api/users-test', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, firstName, email, password FROM users');
    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: err.message || err.code || JSON.stringify(err)
    });
  }
});

app.post('/create-order', async (req, res) => {
  try {
    const amountPaise = parseInt(req.body.amount);

    const order = await razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: 'rcpt_' + Date.now()
    });

    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/save-booking', authenticateToken, async (req, res) => {
  try {
    const { hotelName, amount, paymentId } = req.body;
    const finalAmount = amount / 100;

    await pool.execute(
      'INSERT INTO bookings (userId, hotelName, amount, paymentId) VALUES (?, ?, ?, ?)',
      [req.user.userId, hotelName, finalAmount, paymentId]
    );

    res.json({ message: 'Booking saved successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search-hotels', async (req, res) => {
  const city = req.query.city;

  try {
    const options = {
      method: 'GET',
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
      }
    };

    const locRes = await fetch(
      `https://booking-com.p.rapidapi.com/v1/hotels/locations?name=${city}&locale=en-gb`,
      options
    );

    const locations = await locRes.json();

    if (!locations || locations.length === 0) {
      return res.json([]);
    }

    const destId = locations[0].dest_id;

    const hotelRes = await fetch(
      `https://booking-com.p.rapidapi.com/v1/hotels/search?dest_id=${destId}&order_by=popularity&filter_by_currency=INR&locale=en-gb&checkin_date=2025-10-10&checkout_date=2025-10-11&adults_number=2&room_number=1&units=metric`,
      options
    );

    const data = await hotelRes.json();
    res.json(data.result || []);

  } catch (err) {
    console.error('Hotel API Error:', err);
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});