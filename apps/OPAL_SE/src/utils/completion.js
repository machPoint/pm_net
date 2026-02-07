/**
 * Completion Utilities
 * Provides functions for auto-completing resource templates and prompt arguments
 */

const logger = require('../logger');
const { ERROR_CODES } = require('../config/constants');

/**
 * Get completions for a resource template field
 * 
 * @param {Object} template - The resource template object
 * @param {string} field - The field to get completions for
 * @param {string} prefix - The prefix to filter completions by
 * @returns {Array<string>} - List of possible completions
 */
function getResourceTemplateCompletions(template, field, prefix) {
    // Make sure we have a valid template with content
    if (!template || !template.content) {
        return [];
    }
    
    try {
        // Parse template content (assuming it's JSON)
        const templateData = typeof template.content === 'string' 
            ? JSON.parse(template.content) 
            : template.content;
        
        // Check if the template has a schema with the field
        if (!templateData.schema || !templateData.schema.properties || !templateData.schema.properties[field]) {
            return [];
        }
        
        // Get field schema
        const fieldSchema = templateData.schema.properties[field];
        
        // Handle different field types
        if (fieldSchema.enum) {
            // For enum fields, return all enum values that match the prefix
            return fieldSchema.enum.filter(value => 
                value.toString().toLowerCase().startsWith(prefix.toLowerCase())
            );
        } else if (fieldSchema.type === 'boolean') {
            // For boolean fields, return true/false
            return ['true', 'false'].filter(value => 
                value.startsWith(prefix.toLowerCase())
            );
        } else if (fieldSchema.examples) {
            // If there are examples, use them as completions
            return fieldSchema.examples.filter(example => 
                example.toString().toLowerCase().startsWith(prefix.toLowerCase())
            );
        } else if (templateData.completions && templateData.completions[field]) {
            // If there are explicit completions for this field, use them
            return templateData.completions[field].filter(completion => 
                completion.toString().toLowerCase().startsWith(prefix.toLowerCase())
            );
        }
        
        // Default case: no completions available
        return [];
    } catch (error) {
        logger.error('Error getting template completions:', error);
        return [];
    }
}

/**
 * Get fields available in a resource template
 * 
 * @param {Object} template - The resource template object
 * @returns {Array<string>} - List of available fields
 */
function getResourceTemplateFields(template) {
    // Make sure we have a valid template with content
    if (!template || !template.content) {
        return [];
    }
    
    try {
        // Parse template content (assuming it's JSON)
        const templateData = typeof template.content === 'string' 
            ? JSON.parse(template.content) 
            : template.content;
        
        // Check if the template has a schema with properties
        if (!templateData.schema || !templateData.schema.properties) {
            return [];
        }
        
        // Return all property names
        return Object.keys(templateData.schema.properties);
    } catch (error) {
        logger.error('Error getting template fields:', error);
        return [];
    }
}

/**
 * Get completions for a prompt argument
 * 
 * @param {Object} prompt - The prompt object
 * @param {string} argument - The argument to get completions for
 * @param {string} prefix - The prefix to filter completions by
 * @returns {Array<string>} - List of possible completions
 */
function getPromptArgumentCompletions(prompt, argument, prefix) {
    // Make sure we have a valid prompt
    if (!prompt || !prompt.arguments) {
        return [];
    }
    
    try {
        // Find the argument in the prompt's arguments list
        const argDef = prompt.arguments.find(arg => arg.name === argument);
        
        if (!argDef) {
            return [];
        }
        
        // Handle different argument types
        if (argDef.enum) {
            // For enum arguments, return all enum values that match the prefix
            return argDef.enum.filter(value => 
                value.toString().toLowerCase().startsWith(prefix.toLowerCase())
            );
        } else if (argDef.type === 'boolean') {
            // For boolean arguments, return true/false
            return ['true', 'false'].filter(value => 
                value.startsWith(prefix.toLowerCase())
            );
        } else if (argDef.examples) {
            // If there are examples, use them as completions
            return argDef.examples.filter(example => 
                example.toString().toLowerCase().startsWith(prefix.toLowerCase())
            );
        } else if (argDef.completions) {
            // If there are explicit completions for this argument, use them
            return argDef.completions.filter(completion => 
                completion.toString().toLowerCase().startsWith(prefix.toLowerCase())
            );
        }
        
        // Default case: no completions available
        return [];
    } catch (error) {
        logger.error('Error getting prompt argument completions:', error);
        return [];
    }
}

/**
 * Get arguments available in a prompt
 * 
 * @param {Object} prompt - The prompt object
 * @returns {Array<string>} - List of available arguments
 */
function getPromptArguments(prompt) {
    // Make sure we have a valid prompt with arguments
    if (!prompt || !prompt.arguments || !Array.isArray(prompt.arguments)) {
        return [];
    }
    
    // Return all argument names
    return prompt.arguments.map(arg => arg.name);
}

module.exports = {
    getResourceTemplateCompletions,
    getPromptArgumentCompletions,
    getResourceTemplateFields,
    getPromptArguments
};
