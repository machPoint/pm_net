/**
 * Summarization Service
 * Handles content summarization using simple text processing
 */

const logger = require('../logger');
const axios = require('axios');

// Load OpenAI config from environment
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o';
const OPENAI_API_URL = process.env.OPENAI_API_URL || 'https://api.openai.com/v1/chat/completions';


/**
 * Summarize content using OpenAI (if configured) or fallback to simple summarization
 * @param {String} content - Content to summarize
 * @param {String} type - Type of summary (headline, paragraph, full)
 * @returns {Promise<Object>} Summarization result
 */
async function summarizeContent(content, type = 'headline') {
  try {
    logger.info(`Summarizing content with type: ${type}`);
    if (OPENAI_API_KEY) {
      // Choose prompt based on summary type
      let prompt;
      if (type === 'headline') {
        prompt = `Summarize the following content in a single headline:`;
      } else if (type === 'paragraph') {
        prompt = `Summarize the following content in a concise paragraph:`;
      } else {
        prompt = `Summarize the following content in detail for a reader:`;
      }
      
      const messages = [
        { role: 'system', content: 'You are an expert summarizer.' },
        { role: 'user', content: `${prompt}\n\n${content}` }
      ];
      
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: OPENAI_MODEL,
          messages,
          temperature: 0.3,
          max_tokens: type === 'headline' ? 32 : (type === 'paragraph' ? 128 : 512)
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const summary = response.data.choices[0].message.content.trim();
      const tokens_used = response.data.usage?.total_tokens || 0;
      const cost = calculateCost(tokens_used, OPENAI_MODEL);
      return {
        summary,
        tokens_used,
        cost
      };
    } else {
      logger.warn('OPENAI_API_KEY not set. Using simpleTextSummarization fallback.');
      return simpleTextSummarization(content, type);
    }
  } catch (error) {
    logger.error(`Error in summarization: ${error.message}`);
    return {
      summary: "Error generating summary.",
      tokens_used: 0,
      cost: 0
    };
  }
}

/**
 * Simple text summarization without external API
 * @param {String} content - Content to summarize
 * @param {String} type - Type of summary
 * @returns {Object} Summarization result
 */
function simpleTextSummarization(content, type) {
  try {
    logger.info(`Using simple summarization for type: ${type}`);
    
    // Try to parse as JSON if it's a string
    let parsedContent;
    if (typeof content === 'string') {
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        // Not JSON, use as is
        parsedContent = null;
      }
    }
    
    let summary;
    
    // Handle different content types
    if (parsedContent) {
      // Handle NewsData.io format
      if (parsedContent.status === 'success' && Array.isArray(parsedContent.results) && parsedContent.results.length > 0) {
        const article = parsedContent.results[0];
        const title = article.title || '';
        const source = article.source_id || '';
        
        if (type === 'headline') {
          summary = `Latest news: ${title} (via ${source})`;
        } else {
          const description = article.description || '';
          summary = `${title}\n\n${description}\n\nSource: ${source}`;
        }
      } else {
        // Generic JSON handling
        summary = JSON.stringify(parsedContent).substring(0, 200) + '...';
      }
    } else if (typeof content === 'string') {
      // Handle ZenQuotes format
      if (content.includes('Quote:') && content.includes('Author:')) {
        const lines = content.split('\n');
        const quoteLine = lines.find(line => line.startsWith('Quote:')) || '';
        const authorLine = lines.find(line => line.startsWith('Author:')) || '';
        
        const quote = quoteLine.replace('Quote:', '').trim();
        const author = authorLine.replace('Author:', '').trim();
        
        if (type === 'headline') {
          summary = `Quote by ${author}`;
        } else {
          summary = `"${quote}" - ${author}`;
        }
      } else {
        // Generic text handling
        const words = content.split(/\s+/);
        
        if (type === 'headline') {
          // Take first 10 words for headline
          summary = words.slice(0, 10).join(' ');
          if (words.length > 10) summary += '...';
        } else if (type === 'paragraph') {
          // Take first 50 words for paragraph
          summary = words.slice(0, 50).join(' ');
          if (words.length > 50) summary += '...';
        } else {
          // Take first 200 words for full summary
          summary = words.slice(0, 200).join(' ');
          if (words.length > 200) summary += '...';
        }
      }
    } else {
      summary = 'Unable to generate summary for this content type.';
    }
    
    return {
      summary,
      tokens_used: 0,
      cost: 0
    };
  } catch (error) {
    logger.error(`Error in simple summarization: ${error.message}`);
    return {
      summary: 'Error generating summary.',
      tokens_used: 0,
      cost: 0
    };
  }
}

/**
 * Calculate cost based on tokens used and model
 * @param {Number} tokens - Number of tokens used
 * @param {String} model - Model name
 * @returns {Number} Cost in USD
 */
function calculateCost(tokens, model) {
  // Simple cost calculation based on OpenAI pricing (as of April 2025)
  const rates = {
    'gpt-3.5-turbo': 0.0015 / 1000, // $0.0015 per 1K tokens
    'gpt-4-turbo': 0.01 / 1000,     // $0.01 per 1K tokens
  };
  
  const rate = rates[model] || rates['gpt-3.5-turbo'];
  return tokens * rate;
}

module.exports = {
  summarizeContent
};
