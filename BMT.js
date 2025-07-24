// BMT.js - Is file mein sirf browser ka code hai

document.addEventListener('DOMContentLoaded', () => {
    
    const searchForm = document.querySelector('.tour-search-form');
    const resultsContainer = document.getElementById('hotel-results-container');
    const destinationInput = document.getElementById('destination');

    if (searchForm) {
        searchForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const destination = destinationInput.value;
            if (!destination) {
                alert('Please enter a destination.');
                return;
            }

            resultsContainer.innerHTML = '<h4>Searching for hotels...</h4>';

            try {
                // Backend server ko request bhejein
                const response = await fetch(`http://localhost:5000/api/search-hotels?destination=${destination}`);
                const data = await response.json();

                if (response.ok) {
                    displayHotels(data.hotels, destination);
                } else {
                    resultsContainer.innerHTML = `<p style="color: red;">Error: ${data.message}</p>`;
                }
            } catch (error) {
                console.error('Error fetching hotels:', error);
                resultsContainer.innerHTML = '<p style="color: red;">Could not connect to the server.</p>';
            }
        });
    }

    function displayHotels(hotels, destination) {
        resultsContainer.innerHTML = ''; 

        if (hotels.length === 0) {
            resultsContainer.innerHTML = '<h4>No hotels found for this location.</h4>';
            return;
        }

        resultsContainer.innerHTML = `<h3>Hotels in ${destination}:</h3>`;

        hotels.forEach(hotel => {
            const hotelDiv = document.createElement('div');
            hotelDiv.style.border = '1px solid #ddd';
            hotelDiv.style.padding = '15px';
            hotelDiv.style.marginBottom = '10px';
            hotelDiv.style.borderRadius = '8px';
            hotelDiv.innerHTML = `
                <h4 style="margin-top: 0;">${hotel.name}</h4>
                <p><strong>Address:</strong> ${hotel.address}</p>
                <p style="margin-bottom: 0;"><strong>Rating:</strong> ${hotel.rating ? `${hotel.rating} ⭐` : 'Not available'}</p>
            `;
            resultsContainer.appendChild(hotelDiv);
        });
    }
});