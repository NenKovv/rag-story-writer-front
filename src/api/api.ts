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
      throw new Error(`API error: ${response.status} - ${errorData?.detail || 'Unknown error'}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout - please try again');
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
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Status check timeout - please try again');
    }
    throw error;
  }
}

// WebSocket connection URL helper
export function getWebSocketUrl(taskId: string): string {
  return `${config.WS_BASE_URL}/ws/progress/${taskId}`;
}