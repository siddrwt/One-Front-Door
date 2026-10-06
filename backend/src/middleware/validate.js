const Joi = require('joi');

const chatRequestSchema = Joi.object({
  conversationId: Joi.string().allow(null, '').optional(),
  message: Joi.string().min(1).max(2000).optional(),
  query: Joi.string().min(1).max(2000).optional(),
}).or('message', 'query');

const ALLOWED_FEEDBACK_CATEGORIES = [
  'helpful',
  'unhelpful',
  'incorrect_answer',
  'wrong_routing',
  'missing_information',
];

const feedbackRequestSchema = Joi.object({
  turnId: Joi.string().required(),
  feedback: Joi.string().valid('up', 'down').required(),
  category: Joi.string()
    .valid(...ALLOWED_FEEDBACK_CATEGORIES)
    .optional()
    .allow(null),
  comment: Joi.string()
    .trim()
    .max(500)
    .optional()
    .allow('', null),
});

function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({
        error: 'validation_error',
        details: error.details.map((d) => d.message),
      });
    }
    req.body = value;
    next();
  };
}

module.exports = {
  ALLOWED_FEEDBACK_CATEGORIES,
  feedbackRequestSchema,
  validateChatRequest: validateBody(chatRequestSchema),
  validateFeedbackRequest: validateBody(feedbackRequestSchema),
};
