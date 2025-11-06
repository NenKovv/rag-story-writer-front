// Types for the book generation request
export interface BookRequest {
  title: string;
  language: 'BG' | 'EN';
  style: 'kids';
  num_chapters: number;
  include_images: boolean;
  hero_name: string;
}

// Types for task status response
export interface TaskStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    pdf_url: string;
  };
  error?: string;
}

// WebSocket message type (backend format)
export interface WebSocketMessage {
  state: 'PENDING' | 'PROCESSING' | 'IN_PROGRESS' | 'PROGRESS' | 'SUCCESS' | 'COMPLETED' | 'FAILED' | 'ERROR';
  info?: {
    progress?: number;
    chapter?: number;
    pdf_url?: string;
    error?: string;
  };
  error?: string; // Alternative error field
}