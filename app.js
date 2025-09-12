const express = require('express');
const fetch = require('node-fetch'); 
require('dotenv').config(); 

const app = express();
const PORT = 8000;
app.use(express.static(__dirname));
const API_KEY = process.env.LOCATION_API_KEY;

app.get('/search-hotels', async (req, res) => {
    const city = req.query.city;

    if (!city) {
        return res.status(400).json({ error: 'City is required' });
    }

    const apiUrl = `google-map-places-new-v2.p.rapidapi.com${city}&key=${API_KEY}`;

    try {
        const apiResponse = await fetch(apiUrl);
        const data = await apiResponse.json();

        const formattedData = data.results.map(hotel => ({
            name: hotel.name,
            location: hotel.address,
            price: hotel.price_per_night,
            rating: Math.round(hotel.rating),
            imageUrl: hotel.main_photo_url
        }));

        res.json(formattedData); 

    } catch (error) {
        console.error('Error calling external API:', error);
        res.status(500).json({ error: 'Failed to fetch hotel data' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});