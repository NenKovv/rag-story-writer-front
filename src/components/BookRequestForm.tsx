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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-6">
      <div>
        <label htmlFor="title" className="block text-sm font-medium mb-1">
          Book Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          required
          value={formData.title}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md"
          disabled={isLoading}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="language" className="block text-sm font-medium mb-1">
            Language
          </label>
          <select
            id="language"
            name="language"
            required
            value={formData.language}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          >
            <option value="EN">English</option>
            <option value="BG">Bulgarian</option>
          </select>
        </div>

        <div>
          <label htmlFor="style" className="block text-sm font-medium mb-1">
            Story Style
          </label>
          <select
            id="style"
            name="style"
            required
            value={formData.style}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          >
            <option value="kids">Kids</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="num_chapters" className="block text-sm font-medium mb-1">
            Number of Chapters
          </label>
          <input
            type="number"
            id="num_chapters"
            name="num_chapters"
            required
            min="1"
            max="3"
            value={formData.num_chapters}
            onChange={handleChange}
            className="w-full px-3 py-2 border rounded-md"
            disabled={isLoading}
          />
        </div>

        <div className="flex items-center">
          <input
            type="checkbox"
            id="include_images"
            name="include_images"
            checked={formData.include_images}
            onChange={handleChange}
            className="h-4 w-4 mr-2"
            disabled={isLoading}
          />
          <label htmlFor="include_images" className="text-sm font-medium">
            Generate with illustrations?
          </label>
        </div>
      </div>

      <div>
        <label htmlFor="hero_name" className="block text-sm font-medium mb-1">
          Main Character Name
        </label>
        <input
          type="text"
          id="hero_name"
          name="hero_name"
          required
          value={formData.hero_name}
          onChange={handleChange}
          className="w-full px-3 py-2 border rounded-md"
          disabled={isLoading}
        />
      </div>

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? 'Generating...' : 'Generate Story'}
      </button>
    </form>
  );
}