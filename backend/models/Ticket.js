import mongoose from 'mongoose';

// 📝 The blueprint definition for your bug log documents
const ticketSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true 
  },
  priority: { 
    type: String, 
    default: 'Medium' 
  },
  status: { 
    type: String, 
    default: 'Open' 
  },
  // 🔗 The relationship link: Saves the Mongo Unique ID of the user who logged this bug
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Convert schema configuration block into a exportable production data model
export default mongoose.model('Ticket', ticketSchema);
