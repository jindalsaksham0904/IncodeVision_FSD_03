const express = require('express');
const Task = require('../models/Task');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const router = express.Router();

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// GET /api/tasks: Fetch all non-deleted tasks
router.get('/', async (req, res) => {
  try {
    const tasks = await Task.find({ deletedAt: null }).sort({ createdAt: -1 });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// GET /api/tasks/stats: Fetch 7-day completion stats
router.get('/stats', async (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Set to start of the day
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const stats = await Task.aggregate([
      {
        $match: {
          completedAt: { $gte: sevenDaysAgo },
          deletedAt: null
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$completedAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    res.json(stats);
  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// POST /api/tasks: Create a new task
router.post('/', async (req, res) => {
  try {
    const { text, priority, dueDate } = req.body;
    
    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Task text is required' });
    }

    const newTask = new Task({
      text: text.trim(),
      priority: priority || 'medium',
      dueDate: dueDate || null
    });

    const savedTask = await newTask.save();
    res.status(201).json(savedTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// POST /api/tasks/breakdown: Break down goal into subtasks via Gemini
router.post('/breakdown', async (req, res) => {
  try {
    const { goal } = req.body;
    
    if (!goal || !goal.trim()) {
      return res.status(400).json({ error: 'Goal text is required' });
    }
    
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Gemini API key is not configured.' });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const prompt = `Break down the following goal into 3-5 concrete, actionable sub-tasks. 
Goal: "${goal}"
Return ONLY a valid JSON array of strings, where each string is a sub-task. No markdown blocks, no other text.`;
    
    const result = await model.generateContent(prompt);
    let responseText = result.response.text().trim();
    
    // Clean up potential markdown blocks from response
    if (responseText.startsWith('```json')) {
      responseText = responseText.substring(7);
      if (responseText.endsWith('```')) {
        responseText = responseText.substring(0, responseText.length - 3);
      }
    } else if (responseText.startsWith('```')) {
      responseText = responseText.substring(3);
      if (responseText.endsWith('```')) {
        responseText = responseText.substring(0, responseText.length - 3);
      }
    }
    
    let subtasks = [];
    try {
      subtasks = JSON.parse(responseText);
      if (!Array.isArray(subtasks)) {
        throw new Error('Not an array');
      }
    } catch (parseErr) {
      console.error("Failed to parse Gemini response:", responseText);
      return res.status(500).json({ error: 'Failed to parse AI response' });
    }

    // Save subtasks to DB
    const newTasks = await Promise.all(
      subtasks.map(async (stText) => {
        const t = new Task({ text: stText.trim() });
        return await t.save();
      })
    );
    
    res.status(201).json(newTasks);
  } catch (error) {
    console.error('Breakdown Error:', error);
    res.status(500).json({ error: 'Failed to process AI breakdown' });
  }
});

// PUT /api/tasks/:id: Update task
router.put('/:id', async (req, res) => {
  try {
    const { text, priority, dueDate } = req.body;
    
    const updateData = {};
    if (text !== undefined) updateData.text = text.trim();
    if (priority !== undefined) updateData.priority = priority;
    if (dueDate !== undefined) updateData.dueDate = dueDate;

    const updatedTask = await Task.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    );
    
    if (!updatedTask) return res.status(404).json({ error: 'Task not found' });
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// PATCH /api/tasks/:id/toggle: Toggle completion
router.patch('/:id/toggle', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.completed = !task.completed;
    task.completedAt = task.completed ? new Date() : null;
    
    await task.save();
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle task completion' });
  }
});

// DELETE /api/tasks/:id: Soft delete
router.delete('/:id', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.deletedAt = new Date();
    await task.save();
    
    res.json({ message: 'Task soft deleted', task });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete task' });
  }
});

// PATCH /api/tasks/:id/restore: Undo delete
router.patch('/:id/restore', async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    task.deletedAt = null;
    await task.save();
    
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore task' });
  }
});

module.exports = router;
