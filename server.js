require('dotenv').config();
const express = require('express');
const mysql = require('mysql2/promise'); 
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const cors = require('cors');

const app = express();

// CORS configurations for Vercel
app.use(cors({
    origin: 'https://book-my-tour-co1m.vercel.app', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(__dirname));

// 🟢 FIX 1: Default 'localhost' fallbacks hata diye hain taaki yeh sirf Cloud DB se connect ho
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306, // Aiven database ka port alag hota hai toh auto-detect karega
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

pool.getConnection()
    .then(conn => {
        console.log('✅ Cloud MySQL Connected Successfully!');
        conn.release();
    })
    .catch(err => console.error('❌ Cloud MySQL Error Logs:', err));

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

// 🟢 FIX 2: REAL SIGNUP MODE (Database queries activated with bcrypt encryption)
app.post('/signup', async (req, res) => {
    console.log("--- 🆕 New SignUp request (REAL DATABASE MODE) ---");
    try {
        const { firstName, lastName, email, password, feedback } = req.body; // user ka saara data unpack kiya
        console.log("Processing Data for:", { firstName, lastName, email });

        // Check user existence
        const [existingUser] = await pool.execute('SELECT email FROM users WHERE email = ?', [email]);
        if (existingUser.length > 0) {
            return res.status(400).json({ message: "Email already registered. Please login." });
        }

        // Encrypt password securely
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Save user into Cloud MySQL Database (with dynamic feedback column support)
        const [result] = await pool.execute(
            'INSERT INTO users (firstName, lastName, email, password, feedback) VALUES (?, ?, ?, ?, ?)',
            [firstName, lastName, email, hashedPassword, feedback || ""]
        );
        
        console.log("✅ User registered and saved to database! ID:", result.insertId);
        return res.status(201).json({ message: "User Created", id: result.insertId });

    } catch (err) { 
        console.error("❌ SignUp MySQL Database Error:", err.message);
        if (!res.headersSent) {
            return res.status(500).json({ error: err.message }); 
        }
    }
});

// 🟢 FIX 3: REAL LOGIN MODE (Fetches real data from DB and validates encrypted password)
app.post('/login', async (req, res) => {
    console.log("--- 🔑 New Login request (REAL DATABASE MODE) ---");
    try {
        const { email, password } = req.body;

        // Fetch user matching the email
        const [rows] = await pool.execute('SELECT * FROM users WHERE email = ?', [email]);
        if (rows.length === 0) {
            return res.status(401).json({ message: "Invalid Email or Password" });
        }

        const user = rows[0];

        // Decrypt and compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: "Invalid Email or Password" });
        }

        // Sign real dynamic token
        const token = jwt.sign(
            { userId: user.id, firstName: user.firstName }, 
            process.env.JWT_SECRET || 'secret_key'
        );
        
        console.log(`✅ ${user.firstName} logged in from database!`);
        return res.json({ token });
    } catch (err) {
        console.error("❌ Login Database Error:", err.message);
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
        res.status(500).json({ error: "Backend crash !" });
    }
});

const PORT = process.env.PORT || 5000; 
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));