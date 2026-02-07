const Ajv = require('ajv');
const schema = require('./apiIntegrationSchema.json');
const logger = require('../logger');

const ajv = new Ajv({ allErrors: true, useDefaults: true });
const validate = ajv.compile(schema);

function validateApiIntegration(config) {
  const valid = validate(config);
  if (!valid) {
    logger.error('API Integration config validation failed', { errors: validate.errors, config });
    throw new Error('Invalid API Integration config: ' + ajv.errorsText(validate.errors));
  }
  return true;
}

module.exports = validateApiIntegration;
