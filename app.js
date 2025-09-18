require('dotenv').config();
const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'BookMyTour.html'));
});

app.get('/search-hotels', async (req, res) => {
    const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY;
    const RAPIDAPI_HOST = process.env.RAPIDAPI_HOST;

    if (!RAPIDAPI_KEY || !RAPIDAPI_HOST) {
        console.error('ERROR: API Key or Host is not defined in the .env file.');
        return res.status(500).json({ error: 'Server configuration error.' });
    }

    const city = req.query.city;
    const checkin = req.query.checkin;
    const checkout = req.query.checkout;

    if (!city) {
        return res.status(400).json({ error: 'City is required' });
    }

    try {
        const locationOptions = {
            method: 'GET',
            url: `https://${RAPIDAPI_HOST}/v1/hotels/locations`,
            params: { name: city, locale: 'en-gb' },
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
            }
        };

        const locationResponse = await axios.request(locationOptions);
        
        if (!locationResponse.data[0] || !locationResponse.data[0].dest_id) {
            return res.status(404).json({ error: `Could not find location: ${city}` });
        }
        
        const dest_id = locationResponse.data[0].dest_id;
        console.log(`Found Destination ID for ${city}: ${dest_id}`);

        const checkin_date = checkin || '2025-09-20';
        const checkout_date = checkout || '2025-09-21';
        const hotelOptions = {
            method: 'GET',
            url: `https://${RAPIDAPI_HOST}/v2/hotels/search`,
            params: {
                order_by: 'popularity',
                adults_number: '2',
                checkin_date: checkin_date,
                filter_by_currency: 'INR',
                dest_id: dest_id, 
                locale: 'en-gb',
                checkout_date: checkout_date,
                units: 'metric',
                room_number: '1',
                dest_type: 'city',
                include_adjacency: 'true'
            },
            headers: {
                'x-rapidapi-key': RAPIDAPI_KEY,
                'x-rapidapi-host': RAPIDAPI_HOST
            }
        };

        const hotelsResponse = await axios.request(hotelOptions);
        const hotelsData = hotelsResponse.data.results;

        const formattedHotels = hotelsData.map(hotel => ({
            name: hotel.name,
            location: `${hotel.address}, ${hotel.city}`,
            rating: hotel.review_score || 'N/A',
            price: hotel.price_breakdown?.gross_price?.value.toLocaleString('en-IN') || 'Not Available',
            imageUrl: hotel.main_photo_url ? hotel.main_photo_url.replace('square60', 'square200') : 'https://via.placeholder.com/400x300.png?text=No+Image'
        }));

        res.json(formattedHotels);

    } catch (error) {
        console.error('RapidAPI Error:', error.message);
        res.status(500).json({ error: 'Failed to fetch data from RapidAPI.' });
    }
});

app.listen(PORT, () => {
    console.log(`Backend server is running on http://localhost:${PORT}`);
});