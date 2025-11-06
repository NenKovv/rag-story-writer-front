import { useState, useId } from 'react';
import type { BookRequest } from '../types/index.js';

interface BookRequestFormProps {
  onSubmit: (request: BookRequest) => void;
  isLoading?: boolean;
}

export default function ImprovedBookRequestForm({ onSubmit, isLoading }: BookRequestFormProps) {
  const formId = useId();
  const [formData, setFormData] = useState<BookRequest>({
    title: '',
    language: 'BG',
    style: 'kids',
    num_chapters: 1,
    include_images: true,
    hero_name: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.title.trim()) {
      newErrors.title = 'Story title is required';
    } else if (formData.title.length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }
    
    if (!formData.hero_name.trim()) {
      newErrors.hero_name = 'Character name is required';
    } else if (formData.hero_name.length < 2) {
      newErrors.hero_name = 'Character name must be at least 2 characters';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    const newValue = type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : type === 'number' 
        ? parseInt(value) 
        : value;
    
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Progress indicator */}
      <div className="mb-8" role="progressbar" aria-label="Form completion progress">
        <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
          <span>Story Details</span>
          <span>Step 1 of 1</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div className="h-2 bg-purple-600 rounded-full w-full transition-all duration-300" />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 bg-white p-8 rounded-xl shadow-lg" noValidate>
        {/* Story Basics Section */}
        <fieldset className="space-y-6">
          <legend className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
            📖 Story Basics
          </legend>
          
          <div>
            <label htmlFor={`${formId}-title`} className="block text-sm font-medium text-gray-700 mb-2">
              What's your story about? *
            </label>
            <input
              type="text"
              id={`${formId}-title`}
              name="title"
              required
              aria-describedby={errors.title ? `${formId}-title-error` : `${formId}-title-help`}
              aria-invalid={!!errors.title}
              value={formData.title}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                errors.title ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              placeholder="e.g., Adventures in the Magic Forest"
              disabled={isLoading}
            />
            {!errors.title ? (
              <p id={`${formId}-title-help`} className="mt-1 text-xs text-gray-500">
                Give your story an exciting title that captures the adventure
              </p>
            ) : (
              <p id={`${formId}-title-error`} className="mt-1 text-sm text-red-600" role="alert">
                <span aria-hidden="true">⚠️</span> {errors.title}
              </p>
            )}
          </div>

          <div>
            <label htmlFor={`${formId}-hero`} className="block text-sm font-medium text-gray-700 mb-2">
              Who's the main character? *
            </label>
            <input
              type="text"
              id={`${formId}-hero`}
              name="hero_name"
              required
              aria-describedby={errors.hero_name ? `${formId}-hero-error` : `${formId}-hero-help`}
              aria-invalid={!!errors.hero_name}
              value={formData.hero_name}
              onChange={handleChange}
              className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-colors ${
                errors.hero_name ? 'border-red-300 bg-red-50' : 'border-gray-200'
              }`}
              placeholder="e.g., Emma, Alex, or Zara"
              disabled={isLoading}
            />
            {!errors.hero_name ? (
              <p id={`${formId}-hero-help`} className="mt-1 text-xs text-gray-500">
                This will be the brave hero of your story
              </p>
            ) : (
              <p id={`${formId}-hero-error`} className="mt-1 text-sm text-red-600" role="alert">
                <span aria-hidden="true">⚠️</span> {errors.hero_name}
              </p>
            )}
          </div>
        </fieldset>

        {/* Story Settings Section */}
        <fieldset className="space-y-6">
          <legend className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 mb-4">
            ⚙️ Story Settings
          </legend>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor={`${formId}-language`} className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                id={`${formId}-language`}
                name="language"
                value={formData.language}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isLoading}
              >
                <option value="EN">🇬🇧 English</option>
                <option value="BG">🇧🇬 Bulgarian</option>
              </select>
            </div>

            <div>
              <label htmlFor={`${formId}-chapters`} className="block text-sm font-medium text-gray-700 mb-2">
                Story Length
              </label>
              <select
                id={`${formId}-chapters`}
                name="num_chapters"
                value={formData.num_chapters}
                onChange={handleChange}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                disabled={isLoading}
              >
                <option value={1}>📖 Short Story (1 chapter)</option>
                <option value={2}>📚 Medium Story (2 chapters)</option>
                <option value={3}>📰 Long Story (3 chapters)</option>
              </select>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id={`${formId}-images`}
              name="include_images"
              checked={formData.include_images}
              onChange={handleChange}
              className="h-5 w-5 text-purple-600 border-2 border-gray-300 rounded focus:ring-2 focus:ring-purple-500"
              disabled={isLoading}
            />
            <div>
              <label htmlFor={`${formId}-images`} className="text-sm font-medium text-gray-700 cursor-pointer">
                🎨 Include beautiful illustrations
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Add colorful pictures to bring your story to life
              </p>
            </div>
          </div>
        </fieldset>

        {/* Submit Section */}
        <div className="pt-6 border-t border-gray-200">
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 px-6 rounded-xl font-semibold text-lg
                     hover:from-purple-700 hover:to-blue-700 
                     disabled:opacity-50 disabled:cursor-not-allowed
                     focus:ring-4 focus:ring-purple-300 focus:outline-none
                     transition-all duration-200 transform hover:scale-105 disabled:hover:scale-100"
            aria-describedby={`${formId}-submit-help`}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3" />
                Creating your magical story...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                ✨ Create My Story ✨
              </span>
            )}
          </button>
          <p id={`${formId}-submit-help`} className="mt-2 text-xs text-center text-gray-500">
            This usually takes 2-3 minutes to generate
          </p>
        </div>
      </form>
    </div>
  );
}