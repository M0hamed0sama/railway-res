const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require("path");
const session = require('express-session');
const cors = require('cors');
// const router = express.Router();


const app = express();
const port = 3000;


app.use(session({
    secret:'omhassen12',
    cookie:{maxAge:30000},
    saveUninitialized:false
}))
app.use(express.static(__dirname));
app.use(cors());
app.use(express.json());
// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'omhassen12', // Your MySQL root password
    database: 'user_auth'
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to MySQL database.');
});



// Login Endpoint
app.post('/login', async(req, res) => {
    var sessionData = req.session;

    const { email, password} = req.body;

    const query = 'SELECT * FROM users WHERE email = ?';
    
   
    db.query(query, [email], async (err, results) => {
        if (err) throw err;
        
        if (results.length > 0) {
          
    
            const user = results[0];

            // Check password (if hashed use bcrypt.compare)
            if (password === user.password) {
                
                res.json({ success: true, message: 'Login successful!'});
                 
            } else {
                res.json({ success: false, message: 'Invalid password.' });
            }
        } else {
            res.json({ success: false, message: 'User not found.' });
        }

        
    });
});





// Sign-Up Endpoint
app.post('/signup', (req, res) => {
    const { email, password } = req.body;

    // Check if email already exists in the database
    const checkQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkQuery, [email], (err, results) => {
        if (err) throw err;
   

        if (results.length > 0) {
            // Email already exists
            res.json({ success: false, message: 'Email is already registered.' });
        } else {
            // Insert the new user into the database
            const insertQuery = 'INSERT INTO users (email, password) VALUES (?, ?)';
            db.query(insertQuery, [email, password], (err, results) => {
                if (err) {
                    res.json({ success: false, message: 'Error inserting data.' });
                } else {
                    res.json({ success: true, message: 'Sign-up successful!' });
                }
            });
        }
    });
});

// app.get ('/userid',(req,res) => {
//     const query ='SELECT user_id FROM users';
   
//         db.query(query, (err, results) => {
//             if (err) {
//                 console.error('Error fetching tickets:', err);
//                 return res.status(500).json({ success: false, message: 'Failed to fetch tickets.' });
//             }
    
//             res.json({ success: true, message: query });
// });

app.get('/stations', (req, res) => {
    const query = `
        SELECT DISTINCT fromStation AS station FROM reservations
        UNION
        SELECT DISTINCT toStation AS station FROM reservations
    `;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching stations:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch stations.' });
        }

        const stations = results.map(row => row.station);
        res.json({ success: true, stations });
    });
});

// Fetch reservations with optional filters
app.get('/reservations', (req, res) => {
    const { fromStation, toStation } = req.query;
    let query = 'SELECT train_id, fromStation, toStation, TIME_FORMAT(departureTime, "%H:%i") AS departureTime FROM reservations';
    const params = [];

    if (fromStation || toStation) {
        query += ' WHERE ';
        if (fromStation) {
            query += 'fromStation = ?';
            params.push(fromStation);
        }
        if (toStation) {
            query += fromStation ? ' AND ' : '';
            query += 'toStation = ?';
            params.push(toStation);
        }
    }

    db.query(query, params, (err, results) => {
        if (err) {
            console.error('Error fetching reservations:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch reservations.' });
        }

        res.json({ success: true, reservations: results });
    });
});

// Endpoint to handle reservations
// Reserve tickets endpoint
// Reserve tickets
app.post('/reserve', (req, res) => {
    const { user_id, reservations } = req.body;

    if (!user_id || !reservations || reservations.length === 0) {
        return res.status(400).json({ success: false, message: 'Invalid request data.' });
    }

    const values = reservations.map(reservation => [
        null, // ticket_id (auto-increment)
        reservation.train_id,
        reservation.fromStation,
        reservation.toStation,
        reservation.departureTime,
        user_id
    ]);

    const query = `
        INSERT INTO tickets (ticket_id, train_id, fromStation, toStation, departureTime, user_id)
        VALUES ?
    `;

    db.query(query, [values], (err, results) => {
        if (err) {
            console.error('Error reserving tickets:', err);
            return res.status(500).json({ success: false, message: 'Failed to reserve tickets.' });
        }

        res.json({ success: true, message: 'Tickets reserved successfully!' });
    });
});

// Endpoint to create tickets from selected reservations
app.post('/create-tickets', (req, res) => {
    const tickets = req.body.tickets;

    // Validate the data
    if (!Array.isArray(tickets) || tickets.length === 0) {
        return res.json({ success: false, message: 'No tickets data received.' });
    }

    // Prepare SQL query to insert multiple tickets
    const insertQuery = `
        INSERT INTO tickets (train_id, fromStation, toStation, departureTime, user_id)
        VALUES ?
    `;

    const values = tickets.map(ticket => [
        ticket.train_id, 
        ticket.fromStation, 
        ticket.toStation, 
        ticket.departureTime, 
        ticket.user_id
    ]);

    db.query(insertQuery, [values], (err, results) => {
        if (err) {
            console.error('Error inserting tickets:', err);
            return res.json({ success: false, message: 'Error creating tickets.' });
        }

        res.json({ success: true, message: 'Tickets reserved successfully!' });
    });
});

// Fetch reserved tickets for the user
// Fetch all tickets for the current user
app.get('/tickets', (req, res) => {
    const userId = 2; // Replace with actual user ID from session or authentication

    const query = `
        SELECT ticket_id, train_id, fromStation, toStation, TIME_FORMAT(departureTime, '%H:%i') AS departureTime
        FROM tickets
         WHERE user_id = ?
    `;

    db.query(query, [userId], (err, results) => {
        if (err) {
            console.error('Error fetching tickets:', err);
            return res.status(500).json({ success: false, message: 'Failed to fetch tickets.' });
        }

        res.json({ success: true, tickets: results });
    });
});
// Cancel selected tickets
app.post('/cancel-tickets', (req, res) => {
    const { ticket_ids } = req.body;

    if (!ticket_ids || ticket_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'No tickets selected for cancellation.' });
    }

    const query = 'DELETE FROM tickets WHERE ticket_id IN (?)';
    db.query(query, [ticket_ids], (err, results) => {
        if (err) {
            console.error('Error canceling tickets:', err);
            return res.status(500).json({ success: false, message: 'Failed to cancel tickets.' });
        }

        res.json({ success: true, message: 'Tickets canceled successfully.' });
    });
});



// Start the server
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});




// // Endpoint to fetch distinct stations (for the dropdowns)
// app.get('/stations', async (req, res) => {
//     try {
//         // Query to fetch distinct fromStation and toStation from reservations
//         const [stations] = await db.promise().query('SELECT DISTINCT fromStation FROM reservations');
//         const uniqueStations = stations.map(station => station.fromStation);
//         res.json({ success: true, stations: uniqueStations });
//     } catch (error) {
//         console.error('Error fetching stations:', error);
//         res.status(500).json({ success: false, message: 'Failed to fetch stations' });
//     }
// });



// Fetch distinct stations for the "From" and "To" dropdowns
// app.get('/stations', async (req, res) => {
//     try {
//         const [stations] = await db.execute(`
//             SELECT DISTINCT fromStation, toStation 
//             FROM reservations
//         `);

//         const uniqueStations = new Set();
//         stations.forEach(station => {
//             uniqueStations.add(station.fromStation);
//             uniqueStations.add(station.toStation);
//         });

//         res.json({ success: true, stations: Array.from(uniqueStations) });
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ success: false, message: 'Failed to fetch stations' });
//     }
// });

// Fetch all reservations with optional filtering by 'fromStation' and 'toStation'
// Endpoint to fetch reservations


// app.get('/reservations', async (req, res) => {
//     const { fromStation, toStation } = req.query;

//     // Base query to fetch all reservations
//     let query = 'SELECT * FROM reservations';
//     const queryParams = [];

//     // Apply filters if fromStation and toStation are provided
//     if (fromStation || toStation) {
//         query += ' WHERE';
//         if (fromStation) {
//             query += ' fromStation = ?';
//             queryParams.push(fromStation);
//         }
//         if (toStation) {
//             if (fromStation) query += ' AND';
//             query += ' toStation = ?';
//             queryParams.push(toStation);
//         }
//     }

//     try {
//         // Execute the query with or without filters
//         const [reservations] = await db.promise().query(query, queryParams);

//         if (reservations.length > 0) {
//             res.json({ success: true, reservations });
//         } else {
//             res.json({ success: false, message: 'No reservations found' });
//         }
//     } catch (error) {
//         console.error('Error fetching reservations:', error);
//         res.status(500).json({ success: false, message: 'Failed to fetch reservations' });
//     }
// });


// Start the server


// app.get('/reservations', async (req, res) => {
//     const { fromStation, toStation } = req.query; // Extract filters from query params

//     try {
//         // Base query to fetch reservations
//         let query = 'SELECT train_id, fromStation, toStation, departureTime FROM reservations';
//         const params = [];

//         // Add conditions based on filters
//         if (fromStation || toStation) {
//             query += ' WHERE ';
//             if (fromStation) {
//                 query += 'fromStation = ?';
//                 params.push(fromStation);
//             }
//             if (fromStation && toStation) {
//                 query += ' AND ';
//             }
//             if (toStation) {
//                 query += 'toStation = ?';
//                 params.push(toStation);
//             }
//         }
        

//         // Execute the query
//         const [reservations] = await db.promise().query(query, params);

//         // Check if any reservations exist
//         if (reservations.length >0) {
//             return res.json({ success: true, reservations: [] }); // Return an empty list if no matches
//         }else {
//             res.json({ success: false, message: 'No reservations found' });
//         }

//         res.json({ success: true, reservations });
//     } catch (err) {
//         console.error('Error fetching reservations:', err);
//         res.json({ success: false, message: 'Failed to fetch reservations' });
//     }
// });

// Endpoint to get station list (to populate dropdowns)
// app.get('/stations', async (req, res) => {
//     try { THATS THE WORKING ONE =================================================================
//         // Fetch unique stations from the reservations table
//         const [stations] = await db.promise().query(
//             'SELECT DISTINCT fromStation FROM reservations UNION SELECT DISTINCT toStation FROM reservations'
//         );

//         // Extract station names into a simple array
//         const stationList = stations.map(station => Object.values(station)[0]);

//         res.json({ success: true, stations: stationList });
//     } catch (err) {
//         console.error('Error fetching stations:', err);
//         res.json({ success: false, message: 'Failed to fetch station list' });
//     }
// });

// try {
//     // Query to fetch distinct fromStation and toStation from reservations
//     const [stations] = await db.promise().query('SELECT DISTINCT fromStation FROM reservations');
//     const uniqueStations = stations.map(station => station.fromStation);
//     res.json({ success: true, stations: uniqueStations });
// } catch (error) {
//     console.error('Error fetching stations:', error);
//     res.status(500).json({ success: false, message: 'Failed to fetch stations' });
// }
// })
