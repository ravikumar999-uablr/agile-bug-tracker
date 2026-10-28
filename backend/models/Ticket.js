
import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Ticket title is required'],
      trim: true,
      maxlength: [200, 'Ticket title cannot exceed 200 characters']
    },

    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High', 'Critical'],
      default: 'Medium'
    },

    status: {
      type: String,
      enum: ['Open', 'In Progress', 'In Review', 'Resolved'],
      default: 'Open'
    },

    // Existing field: identifies the ticket creator.
    // Keep this field so existing tickets continue working.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    // New field: associates a ticket with a project.
    // Optional so existing database documents remain valid.
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      default: undefined
    },

    // Future team-assignment feature.
    // Optional until the assignment API is implemented.
    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: undefined
    }
  },
  {
    timestamps: true
  }
);

// Indexes help retrieve tickets by project and creator.
ticketSchema.index({ projectId: 1, createdAt: -1 });
ticketSchema.index({ user: 1, createdAt: -1 });

const Ticket = mongoose.model('Ticket', ticketSchema);

export default Ticket;
