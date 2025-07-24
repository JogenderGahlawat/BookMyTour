// BMT2.js - Is file mein sirf Node.js server ka code hai

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/search-hotels', async (req, res) => {
    const { destination } = req.query;
    const API_KEY = 'AIzaSyBkgLj94P9MLJ6z1BI6Lk4ZzHgVEP6TlLw'; // Apni API Key yahan daalein

    if (!destination) {
        return res.status(400).json({ message: 'Destination is required.' });
    }
    
    if (API_KEY === 'YOUR_Maps_API_KEY') {
        return res.status(500).json({ message: 'API key is not present on server.' });
    }

    const googleApiUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=hotels%20in%20${destination}&key=${API_KEY}`;

    try {
        const response = await axios.get(googleApiUrl);
        const results = response.data.results;

        const hotels = results.map(place => ({
            name: place.name,
            address: place.formatted_address,
            rating: place.rating,
        }));
        
        res.json({ hotels });

    } catch (error) {
        console.error("Google Maps API Error:", error.message);
        res.status(500).json({ message: "Failed to fetch hotel data." });
    }
});

const PORT = 5000;
app.listen(PORT, () => {
    console.log(`Server http://localhost:${PORT} par chal raha hai`);
});