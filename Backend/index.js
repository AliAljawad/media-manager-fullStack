const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const fetch = require('node-fetch');


// Hugging Face API configuration
const HF_API_URL = "https://api-inference.huggingface.co/models/gpt2";

const HF_API_KEY = process.env.HF_API_KEY ; // Replace with your actual API key

// Middleware
app.use(cors());
app.use(express.json());

// Hugging Face API call function
const callHuggingFaceAPI = async (prompt, maxTokens = 100) => {
  try {
    const response = await fetch(HF_API_URL, {
      headers: {
        "Authorization": `Bearer ${HF_API_KEY}`,
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: maxTokens,
          temperature: 0.7,
          do_sample: true,
          return_full_text: false
        }
      }),
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status}`);
    }

    const result = await response.json();
    return result[0]?.generated_text || '';
  } catch (error) {
    console.error('Hugging Face API error:', error);
    throw error;
  }
};

// Helper function to get media database for context
const getMediaDatabase = () => {
  return {
    movies: {
      "the matrix": { creator: "The Wachowskis", releaseDate: "1999", genre: "Sci-Fi", type: "movie" },
      "inception": { creator: "Christopher Nolan", releaseDate: "2010", genre: "Sci-Fi", type: "movie" },
      "interstellar": { creator: "Christopher Nolan", releaseDate: "2014", genre: "Sci-Fi", type: "movie" },
      "blade runner": { creator: "Ridley Scott", releaseDate: "1982", genre: "Sci-Fi", type: "movie" },
      "the godfather": { creator: "Francis Ford Coppola", releaseDate: "1972", genre: "Crime", type: "movie" }
    },
    games: {
      "the witcher 3": { creator: "CD Projekt Red", releaseDate: "2015", genre: "RPG", type: "game" },
      "cyberpunk 2077": { creator: "CD Projekt Red", releaseDate: "2020", genre: "RPG", type: "game" },
      "red dead redemption 2": { creator: "Rockstar Games", releaseDate: "2018", genre: "Action", type: "game" },
      "the last of us": { creator: "Naughty Dog", releaseDate: "2013", genre: "Action", type: "game" }
    },
    books: {
      "dune": { creator: "Frank Herbert", releaseDate: "1965", genre: "Sci-Fi", type: "book" },
      "1984": { creator: "George Orwell", releaseDate: "1949", genre: "Dystopian", type: "book" },
      "the hobbit": { creator: "J.R.R. Tolkien", releaseDate: "1937", genre: "Fantasy", type: "book" }
    }
  };
};

// API Routes

// Generate AI insights about the collection
app.post('/api/generate-insights', async (req, res) => {
  try {
    const { mediaContext, totalItems, completionRate, avgRating, favoriteGenre } = req.body;
    
    const prompt = `Analyze this media collection and provide a personalized insight:
Collection: ${mediaContext}
Stats: ${totalItems} items, ${completionRate}% completed, ${avgRating} avg rating, favorite genre: ${favoriteGenre}
Provide a brief, friendly recommendation or observation about this collection:`;

    const aiResponse = await callHuggingFaceAPI(prompt, 80);
    
    // Clean up the response and provide fallback
    let recommendation = aiResponse.trim();
    if (!recommendation || recommendation.length < 10) {
      recommendation = generateFallbackInsight(completionRate, totalItems, favoriteGenre);
    }

    res.json({ recommendation });
  } catch (error) {
    console.error('Error generating insights:', error);
    res.status(500).json({ 
      error: 'Failed to generate insights',
      recommendation: generateFallbackInsight(req.body.completionRate, req.body.totalItems, req.body.favoriteGenre)
    });
  }
});

// Generate smart recommendations
app.post('/api/generate-recommendations', async (req, res) => {
  try {
    const { favoriteGenre, favoriteType, topRatedItems } = req.body;
    
    const prompt = `Based on these preferences - Genre: ${favoriteGenre}, Type: ${favoriteType}, Top items: ${topRatedItems.join(', ')} - recommend 3 similar titles with reasons:`;

    const aiResponse = await callHuggingFaceAPI(prompt, 120);
    
    // Parse recommendations or use fallback
    let recommendations = parseRecommendations(aiResponse, favoriteGenre, favoriteType);
    if (recommendations.length === 0) {
      recommendations = generateFallbackRecommendations(favoriteGenre, favoriteType);
    }

    res.json({ recommendations });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({ 
      error: 'Failed to generate recommendations',
      recommendations: generateFallbackRecommendations(req.body.favoriteGenre, req.body.favoriteType)
    });
  }
});

// Auto-complete media metadata
app.post('/api/autocomplete-media', async (req, res) => {
  try {
    const { title } = req.body;
    const titleLower = title.toLowerCase();
    
    // First check our local database
    const mediaDB = getMediaDatabase();
    for (const category of Object.values(mediaDB)) {
      for (const [key, value] of Object.entries(category)) {
        if (key.includes(titleLower) || titleLower.includes(key)) {
          return res.json(value);
        }
      }
    }

    // If not found locally, try AI completion
    const prompt = `For the title "${title}", provide creator, release year, genre, and type (movie/game/book/tv_show/music) in format:
Creator: [name]
Year: [year]
Genre: [genre]
Type: [type]`;

    const aiResponse = await callHuggingFaceAPI(prompt, 60);
    const parsed = parseMediaInfo(aiResponse);
    
    if (parsed.creator) {
      res.json(parsed);
    } else {
      res.json({ message: 'No match found' });
    }
  } catch (error) {
    console.error('Error with auto-completion:', error);
    res.status(500).json({ error: 'Auto-completion failed' });
  }
});

// Helper functions
function generateFallbackInsight(completionRate, totalItems, favoriteGenre) {
  const rate = parseFloat(completionRate);
  if (rate > 80) return `Great job! You've completed ${completionRate}% of your collection. Your ${favoriteGenre} taste is showing strong dedication!`;
  if (rate < 30) return `You have a growing collection of ${totalItems} items! Consider focusing on completing some ${favoriteGenre} titles first.`;
  return `Your ${favoriteGenre} collection is well-balanced with ${totalItems} items. Keep exploring new titles!`;
}

function generateFallbackRecommendations(favoriteGenre, favoriteType) {
  const recommendations = {
    'Sci-Fi': {
      movie: ['Arrival', 'Ex Machina', 'Minority Report'],
      game: ['Deus Ex', 'Mass Effect', 'Bioshock'],
      book: ['Foundation', 'Neuromancer', 'The Martian']
    },
    'Fantasy': {
      movie: ['Lord of the Rings', 'Pan\'s Labyrinth', 'The Shape of Water'],
      game: ['Skyrim', 'Dragon Age', 'The Witcher 2'],
      book: ['Game of Thrones', 'Name of the Wind', 'Mistborn']
    },
    'Action': {
      movie: ['John Wick', 'Mad Max: Fury Road', 'The Raid'],
      game: ['God of War', 'Uncharted', 'Doom'],
      book: ['Jack Reacher', 'The Bourne Identity', 'The Girl with the Dragon Tattoo']
    }
  };

  const genreRecs = recommendations[favoriteGenre] || recommendations['Sci-Fi'];
  const typeRecs = genreRecs[favoriteType] || genreRecs['movie'];
  
  return typeRecs.slice(0, 3).map(title => ({
    title,
    reason: `Perfect for ${favoriteGenre} ${favoriteType} fans`
  }));
}

function parseRecommendations(text, genre, type) {
  try {
    // Simple parsing - look for titles in the response
    const lines = text.split('\n').filter(line => line.trim());
    const recommendations = [];
    
    for (const line of lines.slice(0, 3)) {
      if (line.length > 5) {
        recommendations.push({
          title: line.trim().replace(/^\d+\.?\s*/, ''),
          reason: `Recommended based on your ${genre} ${type} preferences`
        });
      }
    }
    
    return recommendations;
  } catch (error) {
    return [];
  }
}

function parseMediaInfo(text) {
  const info = {};
  const lines = text.split('\n');
  
  for (const line of lines) {
    if (line.includes('Creator:')) {
      info.creator = line.split('Creator:')[1]?.trim();
    } else if (line.includes('Year:')) {
      info.releaseDate = line.split('Year:')[1]?.trim();
    } else if (line.includes('Genre:')) {
      info.genre = line.split('Genre:')[1]?.trim();
    } else if (line.includes('Type:')) {
      info.type = line.split('Type:')[1]?.trim().toLowerCase();
    }
  }
  
  return info;
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Media Manager API is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});