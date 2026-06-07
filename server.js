require('dotenv').config();
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const cors = require('cors');

const app = express();

// CORS to allow your Vercel Frontend
app.use(cors({
    origin: 'https://book-my-tour-co1m.vercel.app', 
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], 
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
}));

app.use(express.json());
app.use(express.static(__dirname));

// 🟢 DATABASE CONFIGURATION COMPLETELY REMOVED (No more crash/ECONNREFUSED errors)

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

// 🟢 MODIFIED SIGNUP: Always Successful (Bypassed)
app.post('/signup', async (req, res) => {
    console.log("--- 🆕 New SignUp request (BYPASS MODE) ---");
    try {
        const { firstName, lastName, email, password, feedback } = req.body;
        
        // Print user info in Render logs for verification
        console.log("Data received from frontend:", { firstName, lastName, email, feedback });

        console.log("✅ Signup Bypass: Sending success response to frontend.");
        return res.status(201).json({ 
            success: true,
            message: "User Created Successfully", 
            id: 999 
        });

    } catch (err) { 
        console.error("❌ SignUp Error:", err.message);
        return res.status(500).json({ error: "Internal Server Error" }); 
    }
});

// 🟢 MODIFIED LOGIN: Always Successful (Bypassed)
app.post('/login', async (req, res) => {
    console.log("--- 🔑 New Login request (BYPASS MODE) ---");
    try {
        const { email, password } = req.body;
        console.log("Login Attempt Email:", email);

        // Generate a dummy static JWT token so your frontend code can save it
        const token = jwt.sign(
            { userId: 999, firstName: "Guest" }, 
            process.env.JWT_SECRET || 'super_secret_fallback_key_123456789'
        );
        
        console.log("✅ Login Bypass: Sending dynamic token to frontend.");
        return res.json({ 
            success: true,
            token, 
            firstName: "Guest User" 
        });

    } catch (err) {
        console.error("❌ Login Error Details:", err.message);
        return res.status(500).json({ error: err.message });
    }
});

// 🟢 MODIFIED BOOKING SAVE: Always Successful (Bypassed)
app.post('/api/save-booking', authenticateToken, async (req, res) => {
    try {
        const { hotelName, amount, paymentId } = req.body;
        console.log("Booking data to bypass:", { hotelName, amount, paymentId });

        res.json({ success: true, message: "Success" });
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