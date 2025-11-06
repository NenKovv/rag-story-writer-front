import { useState } from 'react';
import { generateBook } from '../api/api.js';
import type { BookRequest } from '../types/index.js';
import ImprovedBookRequestForm from './ImprovedBookRequestForm.js';
import ImprovedTaskStatus from './ImprovedTaskStatus.js';
import ImprovedPDFPreview from './ImprovedPDFPreview.js';
import ImprovedErrorBanner from './ImprovedErrorBanner.js';

type AppState = 'form' | 'generating' | 'preview';

export default function ImprovedApp() {
  const [appState, setAppState] = useState<AppState>('form');
  const [taskId, setTaskId] = useState<string>();
  const [pdfUrl, setPdfUrl] = useState<string>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState(false);
  const [lastRequest, setLastRequest] = useState<BookRequest>();

  const handleSubmit = async (request: BookRequest) => {
    try {
      setIsLoading(true);
      setError(undefined);
      setLastRequest(request);
      
      const { task_id } = await generateBook(request);
      setTaskId(task_id);
      setAppState('generating');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to start story generation';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTaskComplete = (url: string) => {
    setPdfUrl(url);
    setAppState('preview');
  };

  const handleStartOver = () => {
    setAppState('form');
    setTaskId(undefined);
    setPdfUrl(undefined);
    setError(undefined);
    setLastRequest(undefined);
  };

  const handleRetry = () => {
    if (lastRequest) {
      handleSubmit(lastRequest);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div className="flex items-center space-x-3">
              <div className="text-3xl">📚</div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  Story Weaver
                </h1>
                <p className="text-sm text-gray-600 hidden sm:block">
                  Create magical AI-powered storybooks for children
                </p>
              </div>
            </div>
            
            {appState !== 'form' && (
              <button
                onClick={handleStartOver}
                className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                <span className="mr-2">✨</span>
                Create New Story
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Banner */}
        {error && (
          <div className="mb-8">
            <ImprovedErrorBanner 
              message={error}
              type="error"
              onDismiss={() => setError(undefined)}
              onRetry={lastRequest ? handleRetry : undefined}
              details={error.includes('network') ? 'Network request failed' : undefined}
            />
          </div>
        )}

        {/* Progress Breadcrumbs */}
        <div className="mb-8">
          <nav aria-label="Progress" className="flex justify-center">
            <ol className="flex items-center space-x-5">
              <li className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  appState === 'form' 
                    ? 'bg-purple-600 border-purple-600 text-white' 
                    : 'bg-green-100 border-green-200 text-green-600'
                }`}>
                  {appState === 'form' ? '1' : '✓'}
                </div>
                <span className="ml-3 text-sm font-medium text-gray-900">Story Details</span>
              </li>
              
              <div className="flex-1 flex items-center">
                <div className={`w-full border-t-2 ${
                  appState === 'generating' || appState === 'preview' 
                    ? 'border-purple-600' 
                    : 'border-gray-300'
                }`} />
              </div>
              
              <li className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  appState === 'generating'
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : appState === 'preview'
                      ? 'bg-green-100 border-green-200 text-green-600'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  {appState === 'generating' ? '2' : appState === 'preview' ? '✓' : '2'}
                </div>
                <span className={`ml-3 text-sm font-medium ${
                  appState === 'form' ? 'text-gray-400' : 'text-gray-900'
                }`}>
                  Generation
                </span>
              </li>
              
              <div className="flex-1 flex items-center">
                <div className={`w-full border-t-2 ${
                  appState === 'preview' ? 'border-purple-600' : 'border-gray-300'
                }`} />
              </div>
              
              <li className="flex items-center">
                <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                  appState === 'preview'
                    ? 'bg-purple-600 border-purple-600 text-white'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  {appState === 'preview' ? '✓' : '3'}
                </div>
                <span className={`ml-3 text-sm font-medium ${
                  appState === 'preview' ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  Your Story
                </span>
              </li>
            </ol>
          </nav>
        </div>

        {/* Content based on state */}
        {appState === 'form' && (
          <div className="animate-fade-in">
            <ImprovedBookRequestForm 
              onSubmit={handleSubmit} 
              isLoading={isLoading} 
            />
          </div>
        )}

        {appState === 'generating' && taskId && (
          <div className="animate-fade-in">
            <ImprovedTaskStatus 
              taskId={taskId} 
              onComplete={handleTaskComplete} 
            />
          </div>
        )}

        {appState === 'preview' && pdfUrl && (
          <div className="animate-fade-in">
            <ImprovedPDFPreview pdfUrl={pdfUrl} />
            
            {/* Action buttons */}
            <div className="mt-8 text-center">
              <button
                onClick={handleStartOver}
                className="inline-flex items-center px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all duration-200 focus:ring-4 focus:ring-blue-300 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <span className="mr-3 text-xl">✨</span>
                <span className="text-lg">Create Another Story</span>
                <span className="ml-3 text-xl">✨</span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600">
            <p className="mb-2">
              Powered by AI magic ✨ | Stories created with love and imagination
            </p>
            <p>
              Perfect for bedtime stories, creative learning, and sparking young imaginations
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}