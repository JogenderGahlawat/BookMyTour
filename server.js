require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Razorpay = require('razorpay');
const cors = require('cors');

const app = express();
const PORT = 3000;

// --- 1. MIDDLEWARE ---
app.use(cors());
app.use(express.json());
// Static files handle karne ke liye (index.html, style.css, etc.)
app.use(express.static(__dirname));

// --- 2. RAZORPAY CONFIG ---
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID, 
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// --- 3. MONGODB CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ MongoDB Connected!'))
    .catch(err => console.error('❌ MongoDB Error:', err));

// --- 4. SCHEMAS ---
const User = mongoose.model('User', new mongoose.Schema({
    firstName: String, lastName: String,
    email: { type: String, unique: true },
    password: { type: String, required: true }
}));

const Booking = mongoose.model('Booking', new mongoose.Schema({
    userId: String, hotelName: String, amount: Number, paymentId: String,
    date: { type: Date, default: Date.now }
}));

// --- 5. AUTH MIDDLEWARE ---
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

// --- 6. ROUTES ---

// Razorpay Key Route
app.get('/api/get-key', (req, res) => {
    res.json({ key: process.env.RAZORPAY_KEY_ID });
});

// Create Razorpay Order
app.post('/create-order', async (req, res) => {
    console.log(">>> Payment Request Received:", req.body.amount);
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
        console.error("Razorpay Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Signup/Login Routes
app.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ firstName, lastName, email, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User Created" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !(await bcrypt.compare(password, user.password))) {
        return res.status(401).json({ message: "Invalid Credentials" });
    }
    const token = jwt.sign({ userId: user._id, firstName: user.firstName }, process.env.JWT_SECRET || 'secret_key');
    res.json({ token });
});

// Save Booking Route
app.post('/api/save-booking', authenticateToken, async (req, res) => {
    try {
        const { hotelName, amount, paymentId } = req.body;
        const newBooking = new Booking({
            userId: req.user.userId,
            hotelName,
            amount: amount / 100,
            paymentId
        });
        await newBooking.save();
        res.json({ message: "Success" });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`Razorpay ID: ${process.env.RAZORPAY_KEY_ID ? "LOADED ✅" : "MISSING ❌"}`);
});