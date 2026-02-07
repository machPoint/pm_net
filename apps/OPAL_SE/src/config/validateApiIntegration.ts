import Ajv from 'ajv';
import schema from './apiIntegrationSchema.json';
import logger from '../logger';

const ajv = new Ajv({ allErrors: true, useDefaults: true });
const validate = ajv.compile(schema);

export function validateApiIntegration(config: any): boolean {
  const valid = validate(config);
  if (!valid) {
    logger.error('API Integration config validation failed', { errors: validate.errors, config });
    throw new Error('Invalid API Integration config: ' + ajv.errorsText(validate.errors));
  }
  return true;
}

export default validateApiIntegration;
