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
  const [formData, setFormData] = useState<BookRequest | undefined>();
  const [showEditConfirm, setShowEditConfirm] = useState(false);

  const handleSubmit = async (request: BookRequest) => {
    try {
      setIsLoading(true);
      setError(undefined);
      // Save form data for potential back navigation
      setFormData(request);
      localStorage.setItem('storyFormData', JSON.stringify(request));
      
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

  const handleStartOver = () => {
    setTaskId(undefined);
    setPdfUrl(undefined);
    setError(undefined);
    setFormData(undefined);
    localStorage.removeItem('storyFormData');
  };

  const handleEditDetails = () => {
    setShowEditConfirm(true);
  };

  const confirmEditDetails = () => {
    setTaskId(undefined);
    setError(undefined);
    setShowEditConfirm(false);
    // Keep formData and localStorage intact for editing
  };

  const cancelEditDetails = () => {
    setShowEditConfirm(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <header className="bg-white shadow-lg border-b-4 border-purple-400">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              ✨ Story Weaver ✨
            </h1>
            <p className="text-lg text-gray-600">Create magical AI-powered storybooks for children</p>
          </div>
        </div>
      </header>

      {/* Progress Breadcrumbs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <nav aria-label="Story creation progress" className="flex-1 flex justify-center">
              <ol className="flex items-center space-x-4 sm:space-x-8">
                {/* Step 1: Story Details */}
                <li className="flex items-center">
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 text-sm font-semibold ${
                      !taskId && !pdfUrl
                        ? 'bg-blue-600 border-blue-600 text-white' 
                        : 'bg-green-100 border-green-500 text-green-700'
                    }`}>
                      {!taskId && !pdfUrl ? '1' : '✓'}
                    </div>
                    {/* Desktop text - only show on larger screens */}
                    <span className={`ml-3 text-sm font-medium hidden sm:inline ${
                      !taskId && !pdfUrl ? 'text-blue-600' : 'text-green-700'
                    }`}>
                      Story Details
                    </span>
                    {/* Mobile text - only show on small screens */}
                    <span className={`ml-3 text-sm font-medium inline sm:hidden ${
                      !taskId && !pdfUrl ? 'text-blue-600' : 'text-green-700'
                    }`}>
                      Details
                    </span>
                  </div>
                </li>

                {/* Connector */}
                <li className="flex items-center">
                  <div className={`w-8 sm:w-16 h-0.5 ${
                    taskId || pdfUrl ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                </li>

                {/* Step 2: Generation */}
                <li className="flex items-center">
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 text-sm font-semibold ${
                      taskId && !pdfUrl
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : pdfUrl
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}>
                      {taskId && !pdfUrl ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : pdfUrl ? '✓' : '2'}
                    </div>
                    {/* Desktop text */}
                    <span className={`ml-3 text-sm font-medium hidden sm:inline ${
                      taskId && !pdfUrl
                        ? 'text-blue-600'
                        : pdfUrl
                          ? 'text-green-700'
                          : 'text-gray-500'
                    }`}>
                      Creating Story
                    </span>
                    {/* Mobile text */}
                    <span className={`ml-3 text-sm font-medium inline sm:hidden ${
                      taskId && !pdfUrl
                        ? 'text-blue-600'
                        : pdfUrl
                          ? 'text-green-700'
                          : 'text-gray-500'
                    }`}>
                      Creating
                    </span>
                  </div>
                </li>

                {/* Connector */}
                <li className="flex items-center">
                  <div className={`w-8 sm:w-16 h-0.5 ${
                    pdfUrl ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                </li>

                {/* Step 3: Your Story */}
                <li className="flex items-center">
                  <div className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 text-sm font-semibold ${
                      pdfUrl
                        ? 'bg-blue-600 border-blue-600 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-500'
                    }`}>
                      {pdfUrl ? '✓' : '3'}
                    </div>
                    {/* Desktop text */}
                    <span className={`ml-3 text-sm font-medium hidden sm:inline ${
                      pdfUrl ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      Your Story
                    </span>
                    {/* Mobile text */}
                    <span className={`ml-3 text-sm font-medium inline sm:hidden ${
                      pdfUrl ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      Story
                    </span>
                  </div>
                </li>
              </ol>
            </nav>
            
            {/* Navigation Buttons - shows when not on first step */}
            {(taskId || pdfUrl) && (
              <div className="flex items-center space-x-2 ml-4 sm:ml-8">
                {/* Edit Details Button - only show during generation, not when completed */}
                {taskId && !pdfUrl && (
                  <button
                    onClick={handleEditDetails}
                    className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors focus:ring-2 focus:ring-blue-300 border border-blue-200"
                    aria-label="Cancel generation and edit story details"
                  >
                    <span className="mr-2">⬅️</span>
                    <span className="hidden sm:inline">Edit Details</span>
                    <span className="sm:hidden">Edit</span>
                  </button>
                )}
                
                {/* Start Over Button */}
                <button
                  onClick={handleStartOver}
                  className="flex items-center px-3 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors focus:ring-2 focus:ring-gray-300"
                  aria-label="Start creating a new story"
                >
                  <span className="mr-2">🔄</span>
                  <span className="hidden sm:inline">Start Over</span>
                  <span className="sm:hidden">New</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Details Confirmation Modal */}
      {showEditConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 mx-4 max-w-md w-full shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                <span className="text-yellow-600 text-xl">⚠️</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Cancel Story Generation?</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to go back and edit your story details? This will cancel the current generation and you'll need to start over.
            </p>
            <div className="flex space-x-3 justify-end">
              <button
                onClick={cancelEditDetails}
                className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Keep Generating
              </button>
              <button
                onClick={confirmEditDetails}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Yes, Edit Details
              </button>
            </div>
          </div>
        </div>
      )}

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
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
              <BookRequestForm 
                onSubmit={handleSubmit} 
                isLoading={isLoading}
                initialData={formData}
              />
            </div>
          </div>
        )}

        {taskId && !pdfUrl && (
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
              <TaskStatus 
                taskId={taskId} 
                onComplete={handleTaskComplete} 
              />
            </div>
          </div>
        )}

        {pdfUrl && (
          <div className="bg-white rounded-2xl shadow-xl mx-4 lg:mx-8 p-6 border border-blue-100">
            <PDFPreview pdfUrl={pdfUrl} />
          </div>
        )}
      </main>
    </div>
  );
}
