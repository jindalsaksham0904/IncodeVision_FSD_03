const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  text: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 200 
  },
  completed: { 
    type: Boolean, 
    default: false 
  },
  completedAt: { 
    type: Date, 
    default: null 
  },
  deletedAt: { 
    type: Date, 
    default: null 
  },
  priority: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    default: 'medium' 
  },
  dueDate: { 
    type: Date, 
    default: null 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

module.exports = mongoose.model('Task', TaskSchema);
