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
})


// Schemas and Models
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  exercises: [{
    description: { type: String, required: true },
    duration: { type: Number, required: true },
    date: { type: String },
  }],
});


const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: String },
});


const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

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

  if (!description || !duration) {
    return res.status(400).json({ error: 'Description and duration are required' });
  }

  try {
    // Find the user by ID
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Format the date
    const formattedDate = date ? new Date(date).toDateString() : new Date().toDateString();

    // Add exercise to user's exercises array
    user.exercises.push({
      description,
      duration: Number(duration),
      date: formattedDate,
    });
    await user.save();

    // Respond with the expected structure
    res.json({
      username: user.username,
      description,
      duration: Number(duration),
      date: formattedDate,
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
    // Find the user by ID
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Retrieve exercises and format the date using toDateString
    let logs = user.exercises.map((exercise) => ({
      description: exercise.description,
      duration: exercise.duration,
      date: new Date(exercise.date).toDateString(), // Ensure the date is in the required format
    }));

    // Filter based on 'from' and 'to' query parameters
    if (from) {
      const fromDate = new Date(from);
      logs = logs.filter((log) => new Date(log.date) >= fromDate);
    }

    if (to) {
      const toDate = new Date(to);
      logs = logs.filter((log) => new Date(log.date) <= toDate);
    }

    // Apply limit if provided
    if (limit) {
      logs = logs.slice(0, parseInt(limit));
    }

    // Respond with the user object and the formatted log
    res.json({
      username: user.username,
      count: logs.length,
      _id: user._id,
      log: logs,
    });
  } catch (error) {
    console.error('Error retrieving logs:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});




// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
