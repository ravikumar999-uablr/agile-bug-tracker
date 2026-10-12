import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

// 🛡️ Custom Security Modules & Models Imports
import authRoutes from './routes/auth.js';
import authMiddleware from './middleware/auth.js';
import Ticket from './models/Ticket.js';

// 🛠️ Windows Path Handling Configurations for ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// 🛡️ Middleware Engine Setup
app.use(cors());
app.use(express.json());

// 🔌 Connect MongoDB (Using your active cluster credentials directly as fallback)
const mongoConnectionURI = process.env.MONGO_URI || "mongodb+srv://ravikumaruablr_db_user:YOUR_DB_PASSWORD@cluster0.waikcks.mongodb.net/bugtracker?retryWrites=true&w=majority";

mongoose.connect(mongoConnectionURI)
  .then(() => console.log('🔌 Cloud MongoDB connected securely!'))
  .catch(err => console.error('Database connection error:', err));

// 🛡️ Mounting Authentication Routes Gateway
app.use('/api/auth', authRoutes);

// 🟢 GET TICKETS ROUTE (Protected: Only returns tickets belonging to the logged-in user)
app.get('/api/tickets', authMiddleware, async (req, res) => {
  try {
    // 🔍 Secure Query: Search tickets where 'user' matches the ID from the token passport
    const userSpecificTickets = await Ticket.find({ user: req.userId }).sort({ createdAt: -1 });
    res.json(userSpecificTickets);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch your workspace tickets' });
  }
});

// 🟢 CREATE TICKET ROUTE (Protected: Links new ticket automatically to the active user)
app.post('/api/tickets', authMiddleware, async (req, res) => {
  const { title, priority } = req.body;
  
  if (!title) {
    return res.status(400).json({ error: 'Issue title description is required' });
  }

  try {
    // 📝 Secure Association: Link user parameter using verified req.userId field
    const newTicket = new Ticket({ 
      title, 
      priority, 
      user: req.userId 
    });
    const savedTicket = await newTicket.save();
    res.status(201).json(savedTicket);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save ticket to database' });
  }
});

// 🟢 DELETE TICKET ROUTE (Protected: Blocks unauthorized users from removing items)
app.delete('/api/tickets/:id', authMiddleware, async (req, res) => {
  try {
    // 1. Look up target ticket item by ID parameter
    const ticket = await Ticket.findById(req.params.id);
    
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
    
    // 2. 🛡️ Verification Check: Match text string ownership fields
    if (ticket.user.toString() !== req.userId) {
      return res.status(403).json({ error: 'Access Denied: Unauthorized to clear this issue data record.' });
    }

    // 3. Drop record from database collection safely
    await Ticket.findByIdAndDelete(req.params.id);
    res.json({ message: 'Ticket deleted successfully from cloud collection' });
  } catch (error) {
    res.status(500).json({ error: 'Delete execution workflow failed' });
  }
});

// 🟢 Base Health Status Ping Check
app.get('/', (req, res) => {
  res.send('Bug Tracker API Server is running smoothly.');
});

// 🚀 Start the Express Listening Server Thread
app.listen(PORT, () => {
  console.log(`🚀 Secure Server running on: http://localhost:${PORT}`);
});
