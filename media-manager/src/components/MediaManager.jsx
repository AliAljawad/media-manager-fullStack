import React, { useState, useEffect, useMemo } from 'react';
import { Search, Plus, Edit, Trash2, Star, Eye, CheckCircle, Heart, Brain, Sparkles, Filter, Loader } from 'lucide-react';

const MediaManager = () => {
  const [media, setMedia] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [isGeneratingRecs, setIsGeneratingRecs] = useState(false);
  const [backendStatus, setBackendStatus] = useState('checking');

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    creator: '',
    releaseDate: '',
    genre: '',
    type: 'movie',
    status: 'wishlist',
    rating: '',
    description: ''
  });

  // API Base URL - adjust this to match your backend
  const API_BASE_URL = 'http://localhost:3001/api';

  // Status options
  const statusOptions = [
    { value: 'owned', label: 'Owned', icon: CheckCircle, color: 'bg-green-500' },
    { value: 'wishlist', label: 'Wishlist', icon: Heart, color: 'bg-pink-500' },
    { value: 'currently_using', label: 'Currently Using', icon: Eye, color: 'bg-blue-500' },
    { value: 'complete', label: 'Complete', icon: Star, color: 'bg-yellow-500' }
  ];

  // Media types
  const mediaTypes = ['movie', 'music', 'game', 'book', 'tv_show'];

  // Check backend status
  useEffect(() => {
    const checkBackendStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (response.ok) {
          setBackendStatus('connected');
        } else {
          setBackendStatus('error');
        }
      } catch (error) {
        setBackendStatus('disconnected');
      }
    };

    checkBackendStatus();
  }, []);

  // Sample data for demo
  useEffect(() => {
    const sampleData = [
      {
        id: 1,
        title: 'The Matrix',
        creator: 'The Wachowskis',
        releaseDate: '1999',
        genre: 'Sci-Fi',
        type: 'movie',
        status: 'owned',
        rating: '9.5',
        description: 'A computer programmer discovers reality is a simulation.'
      },
      {
        id: 2,
        title: 'Inception',
        creator: 'Christopher Nolan',
        releaseDate: '2010',
        genre: 'Sci-Fi',
        type: 'movie',
        status: 'complete',
        rating: '9.0',
        description: 'Dreams within dreams in this mind-bending thriller.'
      },
      {
        id: 3,
        title: 'The Witcher 3',
        creator: 'CD Projekt Red',
        releaseDate: '2015',
        genre: 'RPG',
        type: 'game',
        status: 'currently_using',
        rating: '9.8',
        description: 'Epic fantasy RPG with meaningful choices.'
      }
    ];
    setMedia(sampleData);
  }, []);

  // API call functions
  const callBackendAPI = async (endpoint, data = null) => {
    try {
      const options = {
        method: data ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Backend API error:', error);
      throw error;
    }
  };

  // AI Feature: Generate insights about collection
  const generateAIInsights = async (mediaList) => {
    if (backendStatus !== 'connected' || mediaList.length === 0) {
      return;
    }

    setIsGeneratingInsights(true);
    try {
      // Basic stats
      const totalItems = mediaList.length;
      const favoriteGenre = getMostCommonGenre(mediaList);
      const completionRate = (mediaList.filter(item => item.status === 'complete').length / mediaList.length * 100).toFixed(1);
      const avgRating = (mediaList.reduce((sum, item) => sum + parseFloat(item.rating || 0), 0) / mediaList.length).toFixed(1);

      // Create context for AI analysis
      const mediaContext = mediaList.map(item => `${item.title} (${item.type}, ${item.genre}, ${item.status})`).join(', ');
      
      const result = await callBackendAPI('/generate-insights', {
        mediaContext,
        totalItems,
        completionRate,
        avgRating,
        favoriteGenre
      });

      const insights = {
        totalItems,
        favoriteGenre,
        completionRate,
        avgRating,
        recommendation: result.recommendation || generateFallbackInsight(mediaList)
      };

      setAiInsights(insights);
    } catch (error) {
      console.error('Error generating AI insights:', error);
      // Fallback to basic insights
      const insights = {
        totalItems: mediaList.length,
        favoriteGenre: getMostCommonGenre(mediaList),
        completionRate: (mediaList.filter(item => item.status === 'complete').length / mediaList.length * 100).toFixed(1),
        avgRating: (mediaList.reduce((sum, item) => sum + parseFloat(item.rating || 0), 0) / mediaList.length).toFixed(1),
        recommendation: generateFallbackInsight(mediaList)
      };
      setAiInsights(insights);
    } finally {
      setIsGeneratingInsights(false);
    }
  };

  // AI Feature: Smart recommendations
  const generateRecommendations = async (mediaList) => {
    if (backendStatus !== 'connected' || mediaList.length === 0) {
      return;
    }

    setIsGeneratingRecs(true);
    try {
      const favoriteGenre = getMostCommonGenre(mediaList);
      const favoriteType = getMostCommonType(mediaList);
      const topRatedItems = mediaList
        .filter(item => item.rating && parseFloat(item.rating) >= 8)
        .map(item => item.title)
        .slice(0, 3);

      const result = await callBackendAPI('/generate-recommendations', {
        favoriteGenre,
        favoriteType,
        topRatedItems
      });

      setRecommendations(result.recommendations || generateFallbackRecommendations(favoriteGenre));
    } catch (error) {
      console.error('Error generating AI recommendations:', error);
      // Fallback recommendations
      setRecommendations(generateFallbackRecommendations(getMostCommonGenre(mediaList)));
    } finally {
      setIsGeneratingRecs(false);
    }
  };

  // AI Feature: Auto-complete metadata
  const handleTitleChange = async (title) => {
    setFormData(prev => ({ ...prev, title }));
    
    // Only try AI completion if backend is connected and title is long enough
    if (backendStatus === 'connected' && title.length > 3) {
      try {
        const result = await callBackendAPI('/autocomplete-media', { title });
        
        if (result.creator) {
          setFormData(prev => ({
            ...prev,
            creator: result.creator || prev.creator,
            releaseDate: result.releaseDate || prev.releaseDate,
            genre: result.genre || prev.genre,
            type: result.type || prev.type
          }));
        }
      } catch (error) {
        console.error('Auto-completion failed:', error);
        // Fallback to static completion for demo
        if (title.toLowerCase().includes('matrix')) {
          setFormData(prev => ({
            ...prev,
            creator: 'The Wachowskis',
            releaseDate: '1999',
            genre: 'Sci-Fi',
            type: 'movie'
          }));
        }
      }
    }
  };

  // Fallback functions for when AI fails
  const generateFallbackInsight = (mediaList) => {
    const wishlistCount = mediaList.filter(item => item.status === 'wishlist').length;
    const currentlyUsingCount = mediaList.filter(item => item.status === 'currently_using').length;
    
    if (wishlistCount > 5) return "Your wishlist is getting long! Maybe it's time to start enjoying some of those items.";
    if (currentlyUsingCount > 3) return "You're juggling multiple items! Consider focusing on fewer to fully enjoy them.";
    return "Your collection looks well-balanced! Keep discovering new favorites.";
  };

  const generateFallbackRecommendations = (favoriteGenre) => [
    { title: 'Similar Title 1', reason: `Based on your love for ${favoriteGenre}` },
    { title: 'Similar Title 2', reason: `Recommended for ${favoriteGenre} fans` },
    { title: 'Similar Title 3', reason: `Popular in ${favoriteGenre} category` }
  ];

  const getMostCommonGenre = (mediaList) => {
    if (mediaList.length === 0) return 'Unknown';
    const genres = mediaList.map(item => item.genre);
    const genreCount = genres.reduce((acc, genre) => {
      acc[genre] = (acc[genre] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(genreCount).reduce((a, b) => genreCount[a] > genreCount[b] ? a : b, '');
  };

  const getMostCommonType = (mediaList) => {
    if (mediaList.length === 0) return 'movie';
    const types = mediaList.map(item => item.type);
    const typeCount = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(typeCount).reduce((a, b) => typeCount[a] > typeCount[b] ? a : b, '');
  };

  // Update AI analysis when media changes
  useEffect(() => {
    if (media.length > 0 && backendStatus === 'connected') {
      generateAIInsights(media);
      generateRecommendations(media);
    }
  }, [media, backendStatus]);

  // Filtered and searched media
  const filteredMedia = useMemo(() => {
    return media.filter(item => {
      const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.creator.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.genre.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
      const matchesType = filterType === 'all' || item.type === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [media, searchTerm, filterStatus, filterType]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingItem) {
      setMedia(prev => prev.map(item => 
        item.id === editingItem.id ? { ...formData, id: editingItem.id } : item
      ));
    } else {
      const newItem = { ...formData, id: Date.now() };
      setMedia(prev => [...prev, newItem]);
    }
    
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      title: '', creator: '', releaseDate: '', genre: '', type: 'movie',
      status: 'wishlist', rating: '', description: ''
    });
    setShowForm(false);
    setEditingItem(null);
  };

  const handleEdit = (item) => {
    setFormData(item);
    setEditingItem(item);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    const updatedMedia = media.filter(item => item.id !== id);
    setMedia(updatedMedia);
  };

  const getStatusIcon = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    const Icon = statusOption?.icon || CheckCircle;
    return <Icon className="w-4 h-4" />;
  };

  const getStatusColor = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption?.color || 'bg-gray-500';
  };

  const getBackendStatusColor = () => {
    switch (backendStatus) {
      case 'connected': return 'bg-green-500';
      case 'disconnected': return 'bg-red-500';
      case 'error': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getBackendStatusText = () => {
    switch (backendStatus) {
      case 'connected': return 'AI Features Active';
      case 'disconnected': return 'Backend Disconnected';
      case 'error': return 'Backend Error';
      default: return 'Checking...';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
            AI Media Manager
          </h1>
          <p className="text-purple-200">Organize your collection with intelligent insights</p>
          
          {/* Backend Status Indicator */}
          <div className="mt-4 flex items-center justify-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getBackendStatusColor()}`}></div>
            <span className="text-sm text-gray-300">{getBackendStatusText()}</span>
          </div>
        </div>

        {/* AI Insights Panel */}
        {aiInsights && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8 border border-white/20">
            <div className="flex items-center mb-4">
              <Brain className="w-6 h-6 mr-2 text-purple-400" />
              <h2 className="text-xl font-semibold">AI Collection Insights</h2>
              {isGeneratingInsights && <Loader className="w-4 h-4 ml-2 animate-spin" />}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-400">{aiInsights.totalItems}</div>
                <div className="text-sm text-gray-300">Total Items</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-400">{aiInsights.completionRate}%</div>
                <div className="text-sm text-gray-300">Completed</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-2xl font-bold text-yellow-400">{aiInsights.avgRating}</div>
                <div className="text-sm text-gray-300">Avg Rating</div>
              </div>
              <div className="bg-white/5 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-400">{aiInsights.favoriteGenre}</div>
                <div className="text-sm text-gray-300">Top Genre</div>
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <Sparkles className="w-4 h-4 mr-2 text-yellow-400" />
                <span className="font-medium">AI Recommendation</span>
              </div>
              <p className="text-sm text-gray-200">{aiInsights.recommendation}</p>
            </div>
          </div>
        )}

        {/* Smart Recommendations */}
        {recommendations.length > 0 && (
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8 border border-white/20">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Sparkles className="w-5 h-5 mr-2 text-yellow-400" />
              AI-Generated Recommendations
              {isGeneratingRecs && <Loader className="w-4 h-4 ml-2 animate-spin" />}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {recommendations.map((rec, index) => (
                <div key={index} className="bg-white/5 rounded-lg p-4">
                  <div className="font-medium text-blue-300">{rec.title}</div>
                  <div className="text-sm text-gray-400">{rec.reason}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 mb-8 border border-white/20">
          <div className="flex flex-wrap gap-4 items-center justify-between mb-4">
            <button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Media
            </button>
            
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search media..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Status</option>
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value} className="text-black">
                    {option.label}
                  </option>
                ))}
              </select>
              
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Types</option>
                {mediaTypes.map(type => (
                  <option key={type} value={type} className="text-black capitalize">
                    {type.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Add/Edit Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 w-full max-w-2xl border border-white/20">
              <h2 className="text-2xl font-bold mb-6">
                {editingItem ? 'Edit Media' : 'Add New Media'}
              </h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Title *</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => handleTitleChange(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder={backendStatus === 'connected' ? "Enter title for AI auto-complete..." : "Enter title..."}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Creator</label>
                    <input
                      type="text"
                      value={formData.creator}
                      onChange={(e) => setFormData(prev => ({ ...prev, creator: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Release Date</label>
                    <input
                      type="text"
                      value={formData.releaseDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, releaseDate: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Genre</label>
                    <input
                      type="text"
                      value={formData.genre}
                      onChange={(e) => setFormData(prev => ({ ...prev, genre: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Type</label>
                    <select
                      value={formData.type}
                      onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {mediaTypes.map(type => (
                        <option key={type} value={type} className="text-black capitalize">
                          {type.replace('_', ' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      {statusOptions.map(option => (
                        <option key={option.value} value={option.value} className="text-black">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Rating (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    step="0.1"
                    value={formData.rating}
                    onChange={(e) => setFormData(prev => ({ ...prev, rating: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full bg-white/10 border border-white/20 rounded-lg py-2 px-4 focus:outline-none focus:ring-2 focus:ring-purple-500 h-20"
                  />
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 px-6 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    {editingItem ? 'Update' : 'Add'} Media
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-lg font-medium transition-all duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Media Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMedia.map(item => (
            <div key={item.id} className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20 hover:border-purple-400 transition-all duration-200">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold mb-1">{item.title}</h3>
                  <p className="text-purple-200">{item.creator}</p>
                  <p className="text-sm text-gray-400">{item.releaseDate} • {item.genre}</p>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(item.status)}`}></div>
                  {getStatusIcon(item.status)}
                </div>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm capitalize bg-white/10 px-2 py-1 rounded">
                    {item.type.replace('_', ' ')}
                  </span>
                  {item.rating && (
                    <span className="text-yellow-400 font-bold">★ {item.rating}</span>
                  )}
                </div>
                
                <span className="text-xs bg-purple-500/30 px-2 py-1 rounded capitalize">
                  {statusOptions.find(opt => opt.value === item.status)?.label}
                </span>
              </div>
              
              {item.description && (
                <p className="text-sm text-gray-300 mb-4 line-clamp-2">{item.description}</p>
              )}
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 px-3 py-2 rounded-lg transition-all duration-200 flex items-center justify-center"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredMedia.length === 0 && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🎬</div>
            <p className="text-xl text-gray-400">No media found matching your criteria</p>
            <p className="text-gray-500 mt-2">Try adjusting your search or filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
export default MediaManager;