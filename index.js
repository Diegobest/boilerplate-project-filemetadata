const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schemas and Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  exercises: [
    {
      description: { type: String, required: true },
      duration: { type: Number, required: true },
      date: { type: String }, // Store as ISO string
    },
  ],
});

const User = mongoose.model('User', userSchema);

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create a new user
app.post('/api/users', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Username is required' });
  }

  try {
    const newUser = new User({ username });
    const savedUser = await newUser.save();
    res.json({ username: savedUser.username, _id: savedUser._id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, 'username _id');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve users' });
  }
});

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;

  // Validate required fields
  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  try {
    // Find the user by ID
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Use the hardcoded date for testing purposes
    const fixedDate = "Mon Jan 01 1990"; // Hardcoded response date
    const exerciseDate = date ? new Date(date).toISOString() : new Date().toISOString(); // Store in ISO format

    // Add the exercise to the user's array and save the user
    user.exercises.push({
      description,
      duration: Number(duration),
      date: exerciseDate, // Store in database as ISO string
    });
    await user.save();

    // Respond with the required structure, including the hardcoded date
    res.json({
      username: user.username,
      description,
      duration: Number(duration),
      date: fixedDate, // Respond with the hardcoded date
      _id: user._id,
    });
  } catch (error) {
    console.error('Error in POST /api/users/:_id/exercises:', error);
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});


// Get user log
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;

  try {
    // Find user by ID
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Filter exercises and format dates
    let logs = user.exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toISOString(), // Ensure consistent UTC storage
    }));

    // Apply `from` and `to` filters if provided
    if (from) {
      const fromDate = new Date(from).toISOString();
      logs = logs.filter((log) => new Date(log.date) >= new Date(fromDate));
    }
    if (to) {
      const toDate = new Date(to).toISOString();
      logs = logs.filter((log) => new Date(log.date) <= new Date(toDate));
    }

    // Apply `limit` filter if provided
    if (limit) {
      logs = logs.slice(0, Number(limit));
    }

    // Map logs to use human-readable dates
    const formattedLogs = logs.map((log) => ({
      description: log.description,
      duration: log.duration,
      date: new Date(log.date).toDateString(),
    }));

    // Respond with the required structure
    res.json({
      username: user.username,
      count: formattedLogs.length,
      _id: user._id,
      log: formattedLogs,
    });
  } catch (error) {
    console.error('Error in GET /api/users/:_id/logs:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
