import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';

import authRoutes from './routes/auth.js';
import authMiddleware from './middleware/auth.js';
import Ticket from './models/Ticket.js';
import Project from './models/Project.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 5000;

// --------------------------------------------------
// CORS AND MIDDLEWARE
// --------------------------------------------------

const allowedOrigins = [
  'https://agile-bug-tracker.vercel.app',
  'http://localhost:5173'
];

if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL.replace(/\/+$/, '');

  if (!allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }
}

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error('Origin not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'x-auth-token']
  })
);

app.use(express.json({ limit: '1mb' }));

// --------------------------------------------------
// MONGODB CONNECTION
// --------------------------------------------------

if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is missing from the environment.');
  process.exit(1);
}

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB Atlas connected successfully.');
  })
  .catch((error) => {
    console.error('MongoDB connection failed:', error.message);
    process.exit(1);
  });

// --------------------------------------------------
// AUTHENTICATION
// --------------------------------------------------

app.use('/api/auth', authRoutes);

// --------------------------------------------------
// PROJECT HELPERS
// --------------------------------------------------

async function findAccessibleProject(projectId, userId) {
  if (!mongoose.isValidObjectId(projectId)) {
    return null;
  }

  return Project.findOne({
    _id: projectId,
    $or: [
      { owner: userId },
      { members: userId }
    ]
  });
}

async function getAccessibleProjectIds(userId) {
  const projects = await Project.find({
    $or: [
      { owner: userId },
      { members: userId }
    ]
  }).select('_id');

  return projects.map((project) => project._id);
}

function isTicketCreator(ticket, userId) {
  return ticket.user?.toString() === userId.toString();
}

// --------------------------------------------------
// GET ALL ACCESSIBLE PROJECTS
// GET /api/projects
// --------------------------------------------------

app.get('/api/projects', authMiddleware, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.userId },
        { members: req.userId }
      ]
    }).sort({ updatedAt: -1 });

    return res.status(200).json(projects);
  } catch (error) {
    console.error('Fetch projects error:', error.message);

    return res.status(500).json({
      error: 'Failed to fetch projects.'
    });
  }
});

// --------------------------------------------------
// CREATE PROJECT
// POST /api/projects
// --------------------------------------------------

app.post('/api/projects', authMiddleware, async (req, res) => {
  const name =
    typeof req.body.name === 'string'
      ? req.body.name.trim()
      : '';

  const description =
    typeof req.body.description === 'string'
      ? req.body.description.trim()
      : '';

  if (!name) {
    return res.status(400).json({
      error: 'Project name is required.'
    });
  }

  if (name.length > 100 || description.length > 1000) {
    return res.status(400).json({
      error: 'Project name or description exceeds the allowed length.'
    });
  }

  try {
    const project = await Project.create({
      name,
      description,
      owner: req.userId,
      members: [req.userId]
    });

    return res.status(201).json(project);
  } catch (error) {
    console.error('Create project error:', error.message);

    return res.status(500).json({
      error: 'Failed to create project.'
    });
  }
});

// --------------------------------------------------
// GET TICKETS
// GET /api/tickets
// GET /api/tickets?projectId=PROJECT_ID
// --------------------------------------------------

app.get('/api/tickets', authMiddleware, async (req, res) => {
  try {
    const { projectId } = req.query;

    // If a project ID is supplied, return only that
    // project's tickets after checking membership.
    if (projectId !== undefined) {
      if (!mongoose.isValidObjectId(projectId)) {
        return res.status(400).json({
          error: 'Invalid project ID.'
        });
      }

      const project = await findAccessibleProject(
        projectId,
        req.userId
      );

      if (!project) {
        return res.status(404).json({
          error: 'Project not found or access denied.'
        });
      }

      const tickets = await Ticket.find({
        projectId: project._id
      }).sort({ createdAt: -1 });

      return res.status(200).json(tickets);
    }

    // Without a project filter, preserve visibility of
    // the user's existing tickets and accessible projects.
    const projectIds = await getAccessibleProjectIds(req.userId);

    const tickets = await Ticket.find({
      $or: [
        { user: req.userId },
        { projectId: { $in: projectIds } }
      ]
    }).sort({ createdAt: -1 });

    return res.status(200).json(tickets);
  } catch (error) {
    console.error('Fetch tickets error:', error.message);

    return res.status(500).json({
      error: 'Failed to fetch tickets.'
    });
  }
});

// --------------------------------------------------
// CREATE TICKET
// POST /api/tickets
// --------------------------------------------------

app.post('/api/tickets', authMiddleware, async (req, res) => {
  const title =
    typeof req.body.title === 'string'
      ? req.body.title.trim()
      : '';

  const { priority, projectId } = req.body;

  if (!title) {
    return res.status(400).json({
      error: 'Ticket title is required.'
    });
  }

  if (title.length > 200) {
    return res.status(400).json({
      error: 'Ticket title cannot exceed 200 characters.'
    });
  }

  const allowedPriorities = [
    'Low',
    'Medium',
    'High',
    'Critical'
  ];

  if (
    priority !== undefined &&
    !allowedPriorities.includes(priority)
  ) {
    return res.status(400).json({
      error: 'Invalid ticket priority.'
    });
  }

  try {
    let project = null;

    if (projectId !== undefined) {
      project = await findAccessibleProject(
        projectId,
        req.userId
      );

      if (!project) {
        return res.status(404).json({
          error: 'Project not found or access denied.'
        });
      }
    }

    const ticketData = {
      title,
      priority: priority || 'Medium',
      user: req.userId
    };

    if (project) {
      ticketData.projectId = project._id;
    }

    const ticket = await Ticket.create(ticketData);

    return res.status(201).json(ticket);
  } catch (error) {
    console.error('Create ticket error:', error.message);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: error.message
      });
    }

    return res.status(500).json({
      error: 'Failed to create ticket.'
    });
  }
});

// --------------------------------------------------
// UPDATE TICKET STATUS
// PUT /api/tickets/:id/status
// --------------------------------------------------

app.put(
  '/api/tickets/:id/status',
  authMiddleware,
  async (req, res) => {
    const { status } = req.body;

    const allowedStatuses = [
      'Open',
      'In Progress',
      'In Review',
      'Resolved'
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status. Choose Open, In Progress, In Review, or Resolved.'
      });
    }

    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          error: 'Invalid ticket ID.'
        });
      }

      const ticket = await Ticket.findById(req.params.id);

      if (!ticket) {
        return res.status(404).json({
          error: 'Ticket not found.'
        });
      }

      if (ticket.projectId) {
        const project = await findAccessibleProject(
          ticket.projectId.toString(),
          req.userId
        );

        if (!project) {
          return res.status(403).json({
            error: 'You do not have access to this project.'
          });
        }
      } else if (!isTicketCreator(ticket, req.userId)) {
        return res.status(403).json({
          error: 'You cannot update this ticket.'
        });
      }

      ticket.status = status;

      const updatedTicket = await ticket.save();

      return res.status(200).json(updatedTicket);
    } catch (error) {
      console.error('Update ticket status error:', error.message);

      if (error.name === 'ValidationError') {
        return res.status(400).json({
          error: error.message
        });
      }

      return res.status(500).json({
        error: 'Failed to update ticket status.'
      });
    }
  }
);

// --------------------------------------------------
// DELETE TICKET
// DELETE /api/tickets/:id
// --------------------------------------------------

app.delete(
  '/api/tickets/:id',
  authMiddleware,
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({
          error: 'Invalid ticket ID.'
        });
      }

      const ticket = await Ticket.findById(req.params.id);

      if (!ticket) {
        return res.status(404).json({
          error: 'Ticket not found.'
        });
      }

      if (ticket.projectId) {
        const project = await findAccessibleProject(
          ticket.projectId.toString(),
          req.userId
        );

        if (!project) {
          return res.status(403).json({
            error: 'You do not have access to this project.'
          });
        }

        const isProjectOwner =
          project.owner.toString() === req.userId.toString();

        if (
          !isTicketCreator(ticket, req.userId) &&
          !isProjectOwner
        ) {
          return res.status(403).json({
            error: 'Only the ticket creator or project owner can delete this ticket.'
          });
        }
      } else if (!isTicketCreator(ticket, req.userId)) {
        return res.status(403).json({
          error: 'You cannot delete this ticket.'
        });
      }

      await Ticket.findByIdAndDelete(ticket._id);

      return res.status(200).json({
        message: 'Ticket deleted successfully.'
      });
    } catch (error) {
      console.error('Delete ticket error:', error.message);

      return res.status(500).json({
        error: 'Failed to delete ticket.'
      });
    }
  }
);

// --------------------------------------------------
// HEALTH CHECK
// --------------------------------------------------

app.get('/', (req, res) => {
  return res.status(200).send('Bug Tracker API Server is running.');
});

// --------------------------------------------------
// START SERVER
// --------------------------------------------------

app.listen(PORT, () => {
  console.log(`Bug Tracker API listening on port ${PORT}`);
});
