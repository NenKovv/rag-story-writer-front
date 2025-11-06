import type { BookRequest } from '../types/index.js';
import type { TaskStatus } from '../types/index.js';
import { config, isDevelopment } from '../config/env.js';

// Function to generate a new book
export async function generateBook(payload: BookRequest): Promise<{ task_id: string }> {
  // Transform frontend field names to match backend expectations
  const backendPayload = {
    title: payload.title,
    language: payload.language.toLowerCase(), // Convert to lowercase: "EN" -> "en", "BG" -> "bg"
    style: payload.style,
    chapters: payload.num_chapters, // Map num_chapters to chapters
    include_images: payload.include_images,
    characters: [payload.hero_name], // Map hero_name to characters array
  };

  // Only log in development
  if (isDevelopment) {
    console.log('Sending payload to backend:', backendPayload);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

  try {
    const response = await fetch(`${config.API_BASE_URL}/generate-book-async-task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(backendPayload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      if (isDevelopment) {
        console.error('Backend error:', errorData);
      }
      
      // Create more user-friendly error messages
      let friendlyMessage = '';
      switch (response.status) {
        case 400:
          friendlyMessage = 'Some story details need to be checked. Please review your story information and try again.';
          break;
        case 429:
          friendlyMessage = 'Too many stories being created right now. Please wait a moment and try again.';
          break;
        case 500:
        case 502:
        case 503:
          friendlyMessage = 'Our story workshop is temporarily unavailable. Please try again in a few minutes.';
          break;
        default:
          friendlyMessage = errorData?.detail || `Connection problem (Error ${response.status}). Please try again.`;
      }
      
      throw new Error(friendlyMessage);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Story creation is taking longer than expected. Please try again!');
    }
    
    // Handle network errors more gracefully
    if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
      throw new Error('Unable to connect to Story Magic. Please check your internet connection and try again.');
    }
    
    throw error;
  }
}

// Function to fetch task status
export async function fetchTaskStatus(taskId: string): Promise<TaskStatus> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

  try {
    const response = await fetch(`${config.API_BASE_URL}/tasks/${taskId}/status`, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Story not found. It might have been completed or there was an issue creating it.');
      } else if (response.status >= 500) {
        throw new Error('Story progress check is temporarily unavailable. Your story is still being created!');
      } else {
        throw new Error(`Unable to check story progress (Error ${response.status}). Please try refreshing.`);
      }
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Story progress check is taking too long. Your story is still being created in the background!');
    }
    
    // Handle network errors for status checks
    if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('NetworkError'))) {
      throw new Error('Unable to check story progress. Please check your internet connection.');
    }
    
    throw error;
  }
}

// WebSocket connection URL helper
export function getWebSocketUrl(taskId: string): string {
  return `${config.WS_BASE_URL}/ws/progress/${taskId}`;
}