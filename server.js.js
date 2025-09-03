
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = 3000;
app.use(cors());

const cityIdMap = {
    'delhi': '-2092174',
    'mumbai': '-2102242',
    'jaipur': '-2097334',
    'goa': '-2094770',
    'manali': '-2101658'
};

app.get('/api/search-by-city', async (req, res) => {
    try {
        const cityName = req.query.city.toLowerCase();
        const dest_id = cityIdMap[cityName];

        if (!dest_id) {
            return res.status(400).json({ message: `Sorry, we don't have the ID for ${cityName}. Please try another city.` });
        }
        
        const arrival_date = new Date();
        arrival_date.setDate(arrival_date.getDate() + 1);
        const departure_date = new Date();
        departure_date.setDate(departure_date.getDate() + 2);

        const options = {
            method: 'GET',
            url: 'https://booking-com15.p.rapidapi.com/api/v1/search/searchHotels',
            params: {
                dest_id: dest_id,
                search_type: 'CITY',
                arrival_date: arrival_date.toISOString().split('T')[0],
                departure_date: departure_date.toISOString().split('T')[0],
                adults: '1',
                page_number: '1'
            },
            headers: {
                'X-RapidAPI-Key': process.env.HOTEL_API_KEY,
                'X-RapidAPI-Host': 'booking-com15.p.rapidapi.com'
            }
        };

        const apiResponse = await axios.request(options);
        res.json(apiResponse.data);

    } catch (error) {
        console.error('API Error:', error.response?.data || error.message);
        res.status(500).json({ message: 'Error fetching hotel data from API' });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Server is running on http://localhost:${PORT}`);
});