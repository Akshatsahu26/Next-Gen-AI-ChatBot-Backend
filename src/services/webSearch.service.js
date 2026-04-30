/**
 * Web Search Service
 * Uses Tavily API to fetch real-time information for general queries.
 */
const axios = require('axios');

const searchWeb = async (query) => {
  const apiKey = process.env.TAVILY_API_KEY;
  
  if (!apiKey) {
    console.warn('TAVILY_API_KEY is missing. Skipping web search.');
    return null;
  }

  try {
    const response = await axios.post('https://api.tavily.com/search', {
      api_key: apiKey,
      query: query,
      search_depth: 'basic',
      include_answer: true,
      max_results: 3
    });

    if (response.data && response.data.results) {
      const resultsText = response.data.results
        .map((r, i) => `${i + 1}. [${r.title}](${r.url}): ${r.content}`)
        .join('\n\n');
      
      const answer = response.data.answer ? `Summary: ${response.data.answer}\n\n` : '';
      return `${answer}Search Results:\n${resultsText}`;
    }
    
    return null;
  } catch (error) {
    console.error('Tavily Search Error:', error.response?.data || error.message);
    return null;
  }
};

module.exports = {
  searchWeb
};
