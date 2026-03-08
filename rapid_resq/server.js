/**
 * RapidResQ - Emergency SOS Backend API
 * 
 * Simple Node.js backend using Express.js to handle SOS requests from citizens
 * and display them to the Volunteer Dashboard.
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Enable CORS to allow requests from the frontend HTML files
app.use(express.json()); // Parse JSON request bodies

// Temporarily store SOS requests in an in-memory array
// In a real application, this would be a database (MongoDB, PostgreSQL, etc.)
let sosRequests = [];
let requestCounter = 1;

// Volunteers Storage
let volunteers = [];
let volunteerCounter = 1;

/**
 * @route POST /apply-volunteer
 * @desc Register a new volunteer and generate code
 * @access Public
 */
app.post('/apply-volunteer', (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }
        
        const volunteerCode = `VOL${String(volunteerCounter).padStart(3, '0')}`;
        volunteerCounter++;

        const newVolunteer = { email, password, volunteerCode };
        volunteers.push(newVolunteer);

        console.log(`[AUTH] New Volunteer Registered: ${volunteerCode} (${email})`);
        
        return res.status(201).json({
            success: true,
            message: 'Application Successful',
            volunteerCode
        });
    } catch (error) {
        console.error('Error applying volunteer:', error);
        res.status(500).json({ success: false, message: 'Server error processing request.' });
    }
});

/**
 * @route POST /volunteer-login
 * @desc Authenticate a volunteer using their unique code
 * @access Public
 */
app.post('/volunteer-login', (req, res) => {
    try {
        const { volunteerCode } = req.body;

        if (!volunteerCode) {
            return res.status(400).json({ success: false, message: 'Volunteer code is required.' });
        }

        // Check if the provided code exists in our volunteers array
        const codeUpper = volunteerCode.trim().toUpperCase();
        const found = volunteers.some(v => v.volunteerCode === codeUpper);
        
        if (found) {
            console.log(`[AUTH] Volunteer Logged In: ${codeUpper}`);
            return res.status(200).json({ success: true, message: 'Login successful' });
        } else {
            console.log(`[AUTH] Failed Login Attempt: ${codeUpper}`);
            return res.status(401).json({ success: false, message: 'Invalid Volunteer Code' });
        }
    } catch (error) {
        console.error('Error processing Volunteer login:', error);
        res.status(500).json({ success: false, message: 'Server error processing request.' });
    }
});

/**
 * @route GET /volunteers
 * @desc Get all registered volunteers
 * @access Public
 */
app.get('/volunteers', (req, res) => {
    return res.status(200).json({
        success: true,
        count: volunteers.length,
        data: volunteers
    });
});

/**
 * @route POST /sos
 * @desc Receive a new SOS emergency request
 * @access Public
 */
app.post('/sos', (req, res) => {
    try {
        const { type, peopleAffected, location, timestamp } = req.body;

        // Basic validation
        if (!type || !peopleAffected || !location) {
            return res.status(400).json({ 
                success: false, 
                message: 'Missing required fields: type, peopleAffected, or location.' 
            });
        }

        // Create new SOS record
        const newSOS = {
            id: `REQ-${String(requestCounter).padStart(4, '0')}`,
            type,
            peopleAffected: parseInt(peopleAffected),
            location,
            timestamp: timestamp || new Date().toISOString(),
            status: 'Pending', // Default status: Pending | Rescue in Progress | Resolved
            volunteersAssigned: 0
        };

        sosRequests.unshift(newSOS); // Add to beginning of array so newest is first
        requestCounter++;

        console.log(`[ALERT] New SOS Received: ${newSOS.id} - ${newSOS.type}`);
        
        return res.status(201).json({
            success: true,
            message: 'SOS request received successfully.',
            data: newSOS
        });
    } catch (error) {
        console.error('Error processing SOS POST:', error);
        res.status(500).json({ success: false, message: 'Server error processing request.' });
    }
});

/**
 * @route GET /sos-requests
 * @desc Get all active SOS emergency requests
 * @access Public (Volunteer Dashboard)
 */
app.get('/sos-requests', (req, res) => {
    return res.status(200).json({
        success: true,
        count: sosRequests.length,
        data: sosRequests
    });
});

/**
 * @route PATCH /sos/:id/accept
 * @desc Update an SOS request status to "Rescue in Progress"
 * @access Public (Volunteer Dashboard)
 */
app.patch('/sos/:id/accept', (req, res) => {
    const { id } = req.params;
    
    // Find the request
    const requestIndex = sosRequests.findIndex(req => req.id === id);
    
    if (requestIndex === -1) {
        return res.status(404).json({ success: false, message: 'SOS request not found.' });
    }

    // Update status
    sosRequests[requestIndex].status = 'Rescue in Progress';
    sosRequests[requestIndex].volunteersAssigned += 1;

    console.log(`[UPDATE] Mission Accepted: ${id}`);

    return res.status(200).json({
        success: true,
        message: 'Mission accepted successfully.',
        data: sosRequests[requestIndex]
    });
});

// Start Server
app.listen(PORT, () => {
    console.log(`=======================================`);
    console.log(`🚨 RapidResQ Backend Server Running`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`=======================================`);
});
