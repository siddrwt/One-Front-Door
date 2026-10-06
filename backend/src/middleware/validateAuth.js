const Joi = require('joi');

const signupSchema = Joi.object({
  studentId: Joi.string().min(3).max(30).required(),
  name: Joi.string().min(1).max(100).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).max(100).required(),
  orgId: Joi.string().optional(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().optional(),
  studentId: Joi.string().optional(),
  identifier: Joi.string().optional(),
  password: Joi.string().required(),
}).or('email', 'studentId', 'identifier');

function validateBody(schema) {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ error: 'validation_error', details: error.details.map((d) => d.message) });
    }
    req.body = value;
    next();
  };
}

module.exports = {
  validateSignup: validateBody(signupSchema),
  validateLogin: validateBody(loginSchema),
};
