require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
app.use(express.static(__dirname));
app.use(express.json());

const mongoURI = process.env.MONGO_URI;
mongoose.connect(mongoURI)
    .then(() => console.log('✅ MongoDB connected successfully!'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err);
        process.exit(1);
    });
const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});
const User = mongoose.model('User', userSchema);
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};
app.get('/', (req, res) => {
    res.sendFile((require('path')).join(__dirname, 'BookMyTour.html'));
});
app.get('/login-page', (req, res) => {
    res.sendFile((require('path')).join(__dirname, 'BookMyTourForm.html'));
});
app.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: 'User with this email already exists.' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ firstName, lastName, email, password: hashedPassword });
        await newUser.save();   
        res.status(201).json({ message: 'Signup successful! Please login.' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }
        const payload = { userId: user._id, firstName: user.firstName };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.status(200).json({ message: 'Login successful', token: token });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});
app.get('/api/user/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: "Something went wrong." });
    }
});

app.get('/search-hotels', async (req, res) => {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;
    const { city, checkin, checkout } = req.query;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST || !city) {
        return res.status(400).json({ error: 'Missing required parameters. City is required.' });
    }

    const checkin_date = checkin || new Date().toISOString().split('T')[0];
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const checkout_date = checkout || tomorrow.toISOString().split('T')[0];

    try {
        const locationOptions = {
            method: 'GET',
            url: `https://${RAPIDAPI_HOST}/v1/hotels/locations`,
            params: { name: city, locale: 'en-gb' },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            }
        };

        const locationResponse = await axios.request(locationOptions);
        const locations = locationResponse.data;

        if (!locations || locations.length === 0) {
            return res.status(404).json({ error: 'City not found. Please try a different location.' });
        }
        let dest_id = null;
        const indianLocation = locations.find(loc => loc.country === 'in');

        if (indianLocation) {
            dest_id = indianLocation.dest_id;
        } else {
            dest_id = locations[0].dest_id;
        }
        const hotelSearchOptions = {
            method: 'GET',
            url: `https://${RAPIDAPI_HOST}/v2/hotels/search`,
            params: {
                dest_id: dest_id,
                order_by: 'popularity',
                adults_number: '1',
                checkin_date: checkin_date,
                checkout_date: checkout_date,
                filter_by_currency: 'INR',
                dest_type: 'city',
                locale: 'en-gb',
                units: 'metric',
                room_number: '1',
            },
            headers: {
                'X-RapidAPI-Key': RAPIDAPI_KEY,
                'X-RapidAPI-Host': RAPIDAPI_HOST
            }
        };

        const response = await axios.request(hotelSearchOptions);

        if (!response.data.results) {
            return res.json([]);
        }

        const apiHotels = response.data.results;
        const hotels = apiHotels.map(hotel => ({
            name: hotel.name,
            location: hotel.city,
            rating: hotel.review_score ? (hotel.review_score / 2).toFixed(1) : '4.2',
            price: hotel.price_breakdown?.gross_price?.toLocaleString('en-IN') || 'N/A',
            imageUrl: hotel.main_photo_url || 'https://images.pexels.com/photos/261102/pexels-photo-261102.jpeg'
        }));

        res.json(hotels);

    } catch (error) {
        console.error('---!!! DETAILED API ERROR !!!---');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', error.response.data);
            let errorMessage = 'An unknown API error occurred.';
            if (typeof error.response.data === 'string') {
                errorMessage = error.response.data;
            } else if (error.response.data && (error.response.data.message || error.response.data.detail)) {
                errorMessage = error.response.data.message || error.response.data.detail;
            } else {
                errorMessage = JSON.stringify(error.response.data);
            }
            res.status(500).json({ error: errorMessage });
        } else {
            console.error('Error Message:', error.message);
            res.status(500).json({ error: 'Failed to fetch hotel data. Check your network.' });
        }
    }
});



app.listen(PORT, () => {
    console.log(`✅ Backend server is running on http://localhost:${PORT}`);
});