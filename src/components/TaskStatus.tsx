import React from 'react';
import { useTaskWebSocket } from '../hooks/useTaskWebSocket.js';
import { fetchTaskStatus } from '../api/api.js';

interface TaskStatusProps {
  taskId: string;
  onComplete?: (pdfUrl: string) => void;
}

// Helper functions for contextual feedback
function getStatusEmoji(progress: number, status: string): string {
  if (status === 'completed') return '🎉';
  if (progress >= 75) return '🎨';
  if (progress >= 50) return '✍️';
  if (progress >= 25) return '💭';
  return '🌟';
}

function getStatusTitle(progress: number, status: string): string {
  if (status === 'completed') return 'Story Complete!';
  if (progress >= 75) return 'Adding Illustrations';
  if (progress >= 50) return 'Writing Your Story';
  if (progress >= 25) return 'Planning Adventure';
  return 'Starting Magic...';
}

function getStatusMessage(progress: number, status: string): string {
  if (status === 'completed') return 'Your magical story is ready to read!';
  if (progress >= 75) return 'Adding beautiful illustrations to bring your story to life';
  if (progress >= 50) return 'Our AI is crafting your unique adventure story';
  if (progress >= 25) return 'Developing the plot and characters for your tale';
  return 'Preparing to create something amazing just for you';
}

export default function TaskStatus({ taskId, onComplete }: TaskStatusProps) {
  const { status, progress, pdfUrl, error, isConnected, connectionAttempts } = useTaskWebSocket(taskId);
  const [isCheckingStatus, setIsCheckingStatus] = React.useState(false);

  const handleManualCheck = async () => {
    try {
      setIsCheckingStatus(true);
      const result = await fetchTaskStatus(taskId);
      if (result.status === 'completed' && result.result?.pdf_url) {
        onComplete?.(result.result.pdf_url);
      }
    } catch (err) {
      console.error('Error checking status:', err);
    } finally {
      setIsCheckingStatus(false);
    }
  };

  // Call onComplete when PDF is ready via WebSocket
  React.useEffect(() => {
    if (pdfUrl) {
      onComplete?.(pdfUrl);
    }
  }, [pdfUrl, onComplete]);

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4" role="region" aria-labelledby="story-progress-heading">
      <h2 id="story-progress-heading" className="sr-only">Story Creation Progress</h2>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div 
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? 'bg-emerald-500' : 'bg-red-500'
            }`} 
            role="status"
            aria-label={isConnected ? 'Connected to real-time updates' : 'Disconnected from real-time updates'}
          />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Real-time updates' : 
             connectionAttempts > 0 ? `Trying to connect (${connectionAttempts}/5)...` : 'Connecting...'}
          </span>
        </div>
        {!isConnected && status !== 'completed' && (
          <button
            onClick={handleManualCheck}
            disabled={isCheckingStatus}
            className="text-sm px-4 py-1 bg-orange-100 rounded-md hover:bg-orange-200 disabled:opacity-50 disabled:cursor-not-allowed text-orange-700"
          >
            {isCheckingStatus ? 'Checking...' : 'Check Status'}
          </button>
        )}
      </div>

      {/* Enhanced Progress Section */}
      <div className="space-y-4">
        {/* Contextual Status Message */}
        <div className="text-center">
          <div className="text-2xl mb-2">
            {getStatusEmoji(progress, status)}
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-1">
            {getStatusTitle(progress, status)}
          </h3>
          <p className="text-sm text-gray-600">
            {getStatusMessage(progress, status)}
          </p>
        </div>

        {/* Enhanced Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="font-medium text-gray-700">Creating your magical story</span>
            <span className="text-blue-600 font-semibold" aria-label={`${progress} percent complete`}>{progress}%</span>
          </div>
          <div 
            className="w-full bg-gradient-to-r from-blue-100 to-purple-100 rounded-full h-3 shadow-inner"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Story creation progress"
          >
            <div
              className="bg-gradient-to-r from-blue-500 to-purple-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Progress Steps Indicator */}
        <div className="grid grid-cols-4 gap-2 text-xs" role="list" aria-label="Story creation milestones">
          <div className={`text-center p-2 rounded ${progress >= 25 ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-400'}`} role="listitem">
            <div className="text-lg mb-1" aria-hidden="true">{progress >= 25 ? '✅' : '⏳'}</div>
            <div>Planning</div>
            <span className="sr-only">{progress >= 25 ? 'Completed' : 'In progress'}</span>
          </div>
          <div className={`text-center p-2 rounded ${progress >= 50 ? 'bg-emerald-50 text-emerald-700' : 'bg-pink-50 text-pink-400'}`} role="listitem">
            <div className="text-lg mb-1" aria-hidden="true">{progress >= 50 ? '✅' : '⏳'}</div>
            <div>Writing</div>
            <span className="sr-only">{progress >= 50 ? 'Completed' : 'Pending'}</span>
          </div>
          <div className={`text-center p-2 rounded ${progress >= 75 ? 'bg-emerald-50 text-emerald-700' : 'bg-purple-50 text-purple-400'}`} role="listitem">
            <div className="text-lg mb-1" aria-hidden="true">{progress >= 75 ? '✅' : '⏳'}</div>
            <div>Illustrating</div>
            <span className="sr-only">{progress >= 75 ? 'Completed' : 'Pending'}</span>
          </div>
          <div className={`text-center p-2 rounded ${progress >= 100 ? 'bg-emerald-50 text-emerald-700' : 'bg-yellow-50 text-yellow-400'}`} role="listitem">
            <div className="text-lg mb-1" aria-hidden="true">{progress >= 100 ? '✅' : '⏳'}</div>
            <div>Finalizing</div>
            <span className="sr-only">{progress >= 100 ? 'Completed' : 'Pending'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-gradient-to-r from-orange-50 via-red-50 to-pink-50 border-l-4 border-orange-400 p-4 rounded-r-md shadow-sm">
          <div className="flex items-start">
            <div className="text-orange-400 mr-3 flex-shrink-0">
              <span className="text-xl">�</span>
            </div>
            <div>
              <h4 className="text-orange-800 font-semibold">Don't Worry - We're Still Working on Your Story!</h4>
              <p className="text-orange-700 text-sm mt-1">
                There was a small hiccup while creating your magical story, but our story elves are still working hard behind the scenes.
              </p>
              <div className="bg-orange-100 rounded-md p-2 mt-3">
                <p className="text-orange-800 text-xs font-medium flex items-start">
                  <span className="mr-1 flex-shrink-0">💡</span>
                  <span>Try refreshing this page in a few moments, or go back and create a new story if this one seems stuck!</span>
                </p>
              </div>
              {process.env.NODE_ENV === 'development' && (
                <details className="mt-2">
                  <summary className="text-xs text-orange-600 cursor-pointer">Technical Details (for developers)</summary>
                  <p className="text-xs text-orange-600 mt-1 font-mono bg-orange-50 p-2 rounded">{error}</p>
                </details>
              )}
            </div>
          </div>
        </div>
      )}

      {status === 'completed' && (
        <div className="text-center bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
          <div className="text-4xl mb-3 animate-bounce">🎉</div>
          <h3 className="text-xl font-bold text-green-800 mb-2">Your story is ready!</h3>
          <p className="text-green-700 mb-4">
            Your magical adventure has been created and is waiting for you below.
          </p>
          <div className="text-2xl">📚✨</div>
        </div>
      )}
    </div>
  );
}