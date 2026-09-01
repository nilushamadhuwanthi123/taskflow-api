const Task = require('../models/Task');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../middleware/asyncHandler');

// POST /api/tasks
const createTask = asyncHandler(async (req, res) => {
  const { title, description, status, priority, dueDate } = req.body;

  const task = await Task.create({
    title,
    description,
    status,
    priority,
    dueDate,
    owner: req.user._id,
  });

  res.status(201).json({ task });
});

// GET /api/tasks?status=&priority=
const listTasks = asyncHandler(async (req, res) => {
  const { status, priority } = req.query;

  const filter = { owner: req.user._id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const tasks = await Task.find(filter).sort({ createdAt: -1 });

  res.status(200).json({ count: tasks.length, tasks });
});

// GET /api/tasks/:id
const getTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  if (!task.owner.equals(req.user._id)) {
    throw new ApiError(404, 'Task not found');
  }

  res.status(200).json({ task });
});

// PUT /api/tasks/:id
const updateTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  if (!task.owner.equals(req.user._id)) {
    throw new ApiError(404, 'Task not found');
  }

  const allowedFields = ['title', 'description', 'status', 'priority', 'dueDate'];
  allowedFields.forEach((field) => {
    if (field in req.body) {
      task[field] = req.body[field];
    }
  });

  await task.save();

  res.status(200).json({ task });
});

// DELETE /api/tasks/:id
const deleteTask = asyncHandler(async (req, res) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    throw new ApiError(404, 'Task not found');
  }
  if (!task.owner.equals(req.user._id)) {
    throw new ApiError(404, 'Task not found');
  }

  await task.deleteOne();

  res.status(200).json({ message: 'Task deleted successfully' });
});

module.exports = { createTask, listTasks, getTask, updateTask, deleteTask };
