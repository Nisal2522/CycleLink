/**
 * src/middleware/validate.js — Runs Joi validation and forwards to next or 400.
 */
export function validate(schema, property = "body") {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      const message = error.details.map((d) => d.message).join("; ");
      res.status(400).json({ success: false, message });
      return;
    }
    req[property] = value;
    next();
  };
}
