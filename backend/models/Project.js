
import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Project name is required'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters']
    },

    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1000 characters'],
      default: ''
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ]
  },
  {
    timestamps: true
  }
);

// Prevent the same user ID from appearing more than once in a project.
projectSchema.path('members').validate(function (members) {
  const memberIds = members.map((member) => member.toString());
  return new Set(memberIds).size === memberIds.length;
}, 'A project cannot contain duplicate members.');

const Project = mongoose.model('Project', projectSchema);

export default Project;
