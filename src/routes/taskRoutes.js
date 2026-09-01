const express = require('express');
const { body, param, query } = require('express-validator');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  createTask,
  listTasks,
  getTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');

const router = express.Router();

const STATUS_VALUES = ['todo', 'in-progress', 'done'];
const PRIORITY_VALUES = ['low', 'medium', 'high'];

router.use(protect);

router.post(
  '/',
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().isString(),
    body('status').optional().isIn(STATUS_VALUES).withMessage(`status must be one of: ${STATUS_VALUES.join(', ')}`),
    body('priority')
      .optional()
      .isIn(PRIORITY_VALUES)
      .withMessage(`priority must be one of: ${PRIORITY_VALUES.join(', ')}`),
    body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be a valid date'),
  ],
  validate,
  createTask
);

router.get(
  '/',
  [
    query('status').optional().isIn(STATUS_VALUES),
    query('priority').optional().isIn(PRIORITY_VALUES),
  ],
  validate,
  listTasks
);

router.get('/:id', [param('id').isMongoId().withMessage('Invalid task id')], validate, getTask);

router.put(
  '/:id',
  [
    param('id').isMongoId().withMessage('Invalid task id'),
    body('title').optional().trim().notEmpty().withMessage('Title cannot be empty'),
    body('description').optional().isString(),
    body('status').optional().isIn(STATUS_VALUES).withMessage(`status must be one of: ${STATUS_VALUES.join(', ')}`),
    body('priority')
      .optional()
      .isIn(PRIORITY_VALUES)
      .withMessage(`priority must be one of: ${PRIORITY_VALUES.join(', ')}`),
    body('dueDate').optional({ nullable: true }).isISO8601().withMessage('dueDate must be a valid date'),
  ],
  validate,
  updateTask
);

router.delete('/:id', [param('id').isMongoId().withMessage('Invalid task id')], validate, deleteTask);

module.exports = router;
