const loginForm = document.getElementById('loginForm');
    const messageElement = document.getElementById('message');

    loginForm.addEventListener('submit', async (event) => {
        event.preventDefault(); 
   const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            
            const response = await fetch('http://localhost:5000/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email: email, password: password })
            });

            const data = await response.json();

            if (response.ok) {
                messageElement.textContent = data.msg;
                messageElement.style.color = 'green';
   
            } else {
                
                messageElement.textContent = data.msg;
                messageElement.style.color = 'red';
            }
        } catch (error) {
            console.error('Error:', error);
            messageElement.textContent = 'Server se connect nahi ho pa raha hai. Try again later.';
            messageElement.style.color = 'red';
        }
    
    });
        