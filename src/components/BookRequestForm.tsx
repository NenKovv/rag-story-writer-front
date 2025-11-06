import { useState, useEffect } from 'react';
import type { BookRequest } from '../types/index.js';

interface BookRequestFormProps {
  onSubmit: (request: BookRequest) => void;
  isLoading?: boolean;
  initialData?: BookRequest;
}

export default function BookRequestForm({ onSubmit, isLoading, initialData }: BookRequestFormProps) {
  const [formData, setFormData] = useState<BookRequest>({
    title: '',
    language: 'BG',
    style: 'kids',
    num_chapters: 1,
    include_images: true,
    hero_name: '',
  });

  // Load initial data from props or localStorage
  useEffect(() => {
    const loadInitialData = () => {
      if (initialData) {
        setFormData(initialData);
        return;
      }
      
      // Try to load from localStorage
      const savedData = localStorage.getItem('storyFormData');
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          setFormData(parsedData);
        } catch (error) {
          console.warn('Failed to parse saved form data:', error);
        }
      }
    };

    loadInitialData();
  }, [initialData]);

  const [validationError, setValidationError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError('');
    
    // Basic validation with friendly messages
    if (!formData.title.trim()) {
      setValidationError('🎯 Your story needs a magical title! Please give your adventure a name.');
      return;
    }
    
    if (formData.title.trim().length < 2) {
      setValidationError('📏 Your story title is a bit too short. Try making it at least 2 characters long!');
      return;
    }
    
    if (!formData.hero_name.trim()) {
      setValidationError('🦸 Every great story needs a hero! Please enter a character name.');
      return;
    }
    
    if (formData.hero_name.trim().length < 2) {
      setValidationError('👤 Your hero\'s name is a bit too short. Heroes need at least 2 characters in their name!');
      return;
    }
    
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    // Clear validation error when user starts typing
    if (validationError) {
      setValidationError('');
    }
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' 
        ? (e.target as HTMLInputElement).checked 
        : type === 'number' 
          ? parseInt(value) 
          : value,
    }));
  };

  return (
    <div className="space-y-6">
      {/* Form Header */}
      <div className="text-center mb-8">
        <h2 id="story-form-heading" className="text-2xl font-bold bg-gradient-to-r from-orange-600 via-pink-600 to-purple-600 bg-clip-text text-transparent mb-2">Create Your Magical Story</h2>
        <p className="text-pink-600">Tell us about the adventure you'd like to create!</p>
      </div>

      {/* Validation Error Display */}
      {validationError && (
        <div className="bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 border-l-4 border-yellow-400 rounded-r-lg p-4 mb-6">
          <div className="flex items-start">
            <div className="flex-shrink-0 mr-3">
              <span className="text-xl">🤗</span>
            </div>
            <div>
              <h4 className="text-yellow-800 font-semibold text-sm mb-1">
                Let's Fix This Together!
              </h4>
              <p className="text-yellow-700 text-sm">
                {validationError}
              </p>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" role="form" aria-labelledby="story-form-heading">
        {/* Story Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-gray-700 mb-2">
            <span aria-hidden="true">📚</span> What should we call your story?
          </label>
          <input
            type="text"
            id="title"
            name="title"
            required
            aria-describedby="title-help"
            aria-invalid={validationError.includes('title') ? 'true' : 'false'}
            maxLength={60}
            value={formData.title}
            onChange={handleChange}
            placeholder="The Amazing Adventures of..."
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            disabled={isLoading}
          />
          <div className="flex justify-between mt-1">
            <p id="title-help" className="text-xs text-gray-500">
              Choose a creative title that captures your adventure
            </p>
            <span className="text-xs text-gray-400" aria-label={`${formData.title.length} characters out of 60 maximum`}>
              {formData.title.length}/60
            </span>
          </div>
        </div>

        {/* Language and Style */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="language" className="block text-sm font-semibold text-gray-700 mb-2">
              <span aria-hidden="true">🌍</span> What language should your story be in?
            </label>
            <select
              id="language"
              name="language"
              required
              value={formData.language}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              disabled={isLoading}
              aria-describedby="language-help"
            >
              <option value="EN">English</option>
              <option value="BG">Bulgarian</option>
            </select>
            <p id="language-help" className="text-xs text-gray-500 mt-1">
              The story will be created in your selected language
            </p>
          </div>

          <div>
            <label htmlFor="style" className="block text-sm font-semibold text-gray-700 mb-2">
              ✨ Story style
            </label>
            <select
              id="style"
              name="style"
              required
              value={formData.style}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              disabled={isLoading}
            >
              <option value="kids">Child-Friendly Adventure</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Perfect for young readers and bedtime stories
            </p>
          </div>
        </div>

        {/* Chapters and Illustrations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="num_chapters" className="block text-sm font-semibold text-gray-700 mb-2">
              📖 How long should your story be?
            </label>
            <select
              id="num_chapters"
              name="num_chapters"
              required
              value={formData.num_chapters}
              onChange={handleChange}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
              disabled={isLoading}
            >
              <option value={1}>1 Chapter - Quick Adventure</option>
              <option value={2}>2 Chapters - Short Story</option>
              <option value={3}>3 Chapters - Medium Tale</option>
              <option value={4}>4 Chapters - Long Adventure</option>
              <option value={5}>5 Chapters - Epic Journey</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Choose how many chapters you want in your story
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              🎨 Add beautiful illustrations?
            </label>
            <div className="flex items-center space-x-3">
              <label htmlFor="include_images" className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  id="include_images"
                  name="include_images"
                  checked={formData.include_images}
                  onChange={handleChange}
                  className="w-4 h-4 text-orange-600 border-2 border-orange-300 rounded focus:ring-2 focus:ring-orange-500"
                  disabled={isLoading}
                />
                <span className="text-sm font-medium text-gray-700">
                  Yes, make it magical with pictures!
                </span>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Illustrations help bring your story to life
            </p>
          </div>
        </div>

        {/* Main Character */}
        <div>
          <label htmlFor="hero_name" className="block text-sm font-semibold text-gray-700 mb-2">
            <span aria-hidden="true">🦸</span> Who is the hero of your story?
          </label>
          <input
            type="text"
            id="hero_name"
            name="hero_name"
            required
            maxLength={30}
            value={formData.hero_name}
            onChange={handleChange}
            placeholder="Alex, Luna, Captain Brave..."
            aria-describedby="hero-help"
            aria-invalid={validationError.includes('hero') ? 'true' : 'false'}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
            disabled={isLoading}
          />
          <div className="flex justify-between mt-1">
            <p id="hero-help" className="text-xs text-gray-500">
              Give your main character a memorable name
            </p>
            <span className="text-xs text-gray-400" aria-label={`${formData.hero_name.length} characters out of 30 maximum`}>
              {formData.hero_name.length}/30
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-orange-500 via-pink-500 to-purple-500 text-white py-4 px-6 rounded-lg text-lg font-semibold hover:from-orange-600 hover:via-pink-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
            disabled={isLoading}
            aria-describedby="submit-help"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" role="status" aria-label="Loading"></div>
                <span>Creating your magical story...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span aria-hidden="true" className="mr-2">✨</span>
                Create My Story!
                <span aria-hidden="true" className="ml-2">📚</span>
              </div>
            )}
          </button>
          <p id="submit-help" className="text-xs text-gray-500 text-center mt-2">
            Click to start creating your personalized magical story
          </p>
        </div>
      </form>
    </div>
  );
}