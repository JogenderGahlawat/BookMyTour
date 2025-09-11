require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); 
const jwt = require('jsonwebtoken');

const app = express();
const port = 3000;

app.use(express.static(__dirname));
app.use(express.json());

const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
  .then(() => console.log('✅ MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));


const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

const User = mongoose.model('User', userSchema);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'BookMyTourForm.html'));
});

app.post('/signup', async (req, res) => {
    try {
        const { firstName, lastName, email, password } = req.body;

        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            firstName,
            lastName,
            email,
            password: hashedPassword 
        });
        await newUser.save();

        console.log('✅ New user saved to database:', newUser);
        res.status(201).json({ message: `Welcome, ${firstName}! Your account is created.` });

    } catch (error) {
        console.error('Error during signup:', error);
        res.status(500).json({ message: 'Something went wrong.' });
    }
});

app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email: email });

        if (!user) {

            return res.status(400).json({ message: 'User not found. Please sign up.' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials. Please try again.' });
        }

        const payload = {
            userId: user._id, 
            firstName: user.firstName
        };
         console.log('My JWT Secret is:', process.env.JWT_SECRET); 
        const token = jwt.sign(
            payload, 
            process.env.JWT_SECRET, 
            { expiresIn: '24h' } 
        );

        res.json({ 
            message: `Welcome back, ${user.firstName}! Login successful.`,
            token: token
        });

    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ message: 'Something went wrong.' });
    }
});

app.listen(port, () => {
    console.log(`Server is running. Open http://localhost:${port} in your browser.`);
});