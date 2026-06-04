require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); 
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const cors = require('cors');
const MySQL = require('mysql2');

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.use(cors({
    origin: 'https://book-my-tour-co1m.vercel.app', 
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'hotel_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(conn => {
        console.log('✅ MySQL Connected!');
        conn.release();
    })
    .catch(err => console.error('❌ MySQL Error:', err));

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, 
    key_secret: process.env.RAZORPAY_KEY_SECRET
});



const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET || 'secret_key', (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

app.get('/api/get-key', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});

app.post('/create-order', async (req, res) => {
    try {
        const amountPaise = parseInt(req.body.amount);
        const options = {
            amount: amountPaise, 
            currency: "INR",
            receipt: "rcpt_" + Date.now()
        };
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post('/signup', async (req, res) => {
    console.log("--- 🆕 New SignUp request ---");
    try {
        const { firstName, lastName, email, password } = req.body;
        console.log("Input Data:", { firstName, lastName, email });

        const [existingUser] = await pool.execute(
            'SELECT email FROM users WHERE email = ?', 
            [email]
        );

        if (existingUser.length > 0) {
            console.log("⚠️ Signup Failed: Email already exists ->", email);
            return res.status(400).json({ message: "Email already registered. Please login." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const [result] = await pool.execute(
            'INSERT INTO users (firstName, lastName, email, password) VALUES (?, ?, ?, ?)',
            [firstName, lastName, email, hashedPassword]
        );
        
        console.log("✅ Data save successfully! MySQL Row ID:", result.insertId);
        return res.status(201).json({ message: "User Created", id: result.insertId });

    } catch (err) { 
        console.error("❌ MySQL Error:", err.message);
        if (!res.headersSent) {
            return res.status(500).json({ error: "Internal Server Error" }); 
        }
    }
});
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        
        if (rows.length === 0) return res.status(401).json({ message: "Invalid Credentials" });

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        
        if (!isMatch) return res.status(401).json({ message: "Invalid Credentials" });

        const token = jwt.sign(
            { userId: user.id, firstName: user.firstName }, 
            process.env.JWT_SECRET || 'secret_key'
        );
        res.json({ token });
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

        res.json({ message: "Success" });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/api/search-hotels', async (req, res) => {
    const city = req.query.city;
    
    const options = {
        method: 'GET',
        headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': process.env.RAPIDAPI_HOST
        }
    };

    try {
        const locRes = await fetch(`https://booking-com.p.rapidapi.com/v1/hotels/locations?name=${city}&locale=en-gb`, options);
        const locations = await locRes.json();
        
        if (!locations || locations.length === 0) {
            return res.json([]); 
        }

        const destId = locations[0].dest_id;

        const hotelRes = await fetch(`https://booking-com.p.rapidapi.com/v1/hotels/search?dest_id=${destId}&order_by=popularity&filter_by_currency=INR&locale=en-gb&checkin_date=2025-10-10&checkout_date=2025-10-11&adults_number=2&room_number=1&units=metric`, options);
        
        const data = await hotelRes.json();
        res.json(data.result || []); 

    } catch (error) {
        console.error("API Error:", error);
        res.status(500).json({ error: "Backend crash ho gaya bhai!" });
    }
});

const PORT = process.env.PORT || 5000; 
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));