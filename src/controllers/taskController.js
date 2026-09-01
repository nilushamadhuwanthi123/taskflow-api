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

const SORTABLE_FIELDS = ['createdAt', 'updatedAt', 'dueDate', 'priority', 'title'];

// Parses a `sort` query value like "-createdAt" or "dueDate" into a
// Mongoose sort object, falling back to newest-first when the field isn't
// one of the fields we allow sorting by.
function parseSort(sortParam) {
  if (!sortParam || typeof sortParam !== 'string') {
    return { createdAt: -1 };
  }
  const direction = sortParam.startsWith('-') ? -1 : 1;
  const field = sortParam.replace(/^-/, '');
  if (!SORTABLE_FIELDS.includes(field)) {
    return { createdAt: -1 };
  }
  return { [field]: direction };
}

// GET /api/tasks?status=&priority=&page=&limit=&sort=
const listTasks = asyncHandler(async (req, res) => {
  const { status, priority, sort } = req.query;

  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const filter = { owner: req.user._id };
  if (status) filter.status = status;
  if (priority) filter.priority = priority;

  const [tasks, total] = await Promise.all([
    Task.find(filter)
      .sort(parseSort(sort))
      .skip((page - 1) * limit)
      .limit(limit),
    Task.countDocuments(filter),
  ]);

  res.status(200).json({
    count: tasks.length,
    total,
    page,
    limit,
    totalPages: Math.max(Math.ceil(total / limit), 1),
    tasks,
  });
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
