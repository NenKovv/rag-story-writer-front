import { useState } from 'react';
import { generateBook } from './api/api.js';
import type { BookRequest } from './types/index.js';
import BookRequestForm from './components/BookRequestForm.js';
import TaskStatus from './components/TaskStatus.js';
import PDFPreview from './components/PDFPreview.js';
import ErrorBanner from './components/ErrorBanner.js';

export default function App() {
  const [taskId, setTaskId] = useState<string>();
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (request: BookRequest) => {
    try {
      setIsLoading(true);
      setError(undefined);
      const { task_id } = await generateBook(request);
      setTaskId(task_id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start story generation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskComplete = (url: string) => {
    setPdfUrl(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">
            RAG Story Writer
          </h1>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {error && (
          <div className="max-w-2xl mx-auto mb-6">
            <ErrorBanner 
              message={error} 
              onDismiss={() => setError(undefined)} 
            />
          </div>
        )}

        {!taskId && (
          <BookRequestForm 
            onSubmit={handleSubmit} 
            isLoading={isLoading} 
          />
        )}

        {taskId && !pdfUrl && (
          <TaskStatus 
            taskId={taskId} 
            onComplete={handleTaskComplete} 
          />
        )}

        {pdfUrl && (
          <PDFPreview pdfUrl={pdfUrl} />
        )}
      </main>
    </div>
  );
}
