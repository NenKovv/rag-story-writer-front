import React, { useState, useEffect } from 'react';
import { useTaskWebSocket } from '../hooks/useTaskWebSocket.js';
import { fetchTaskStatus } from '../api/api.js';
import { CheckCircleIcon, ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface TaskStatusProps {
  taskId: string;
  onComplete?: (pdfUrl: string) => void;
}

const PROGRESS_MESSAGES = [
  { min: 0, message: "🤖 AI is reading your story request..." },
  { min: 10, message: "📝 Creating the perfect plot outline..." },
  { min: 25, message: "✍️ Writing your magical story..." },
  { min: 50, message: "🎨 Adding beautiful illustrations..." },
  { min: 75, message: "📚 Formatting your beautiful book..." },
  { min: 90, message: "✨ Adding final magical touches..." },
  { min: 99, message: "🎁 Almost ready! Wrapping up your story..." },
];

export default function ImprovedTaskStatus({ taskId, onComplete }: TaskStatusProps) {
  const { status, progress, pdfUrl, error, isConnected, connectionAttempts } = useTaskWebSocket(taskId);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const [startTime] = useState(Date.now());
  const [showCelebration, setShowCelebration] = useState(false);

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

  // Handle completion celebration
  useEffect(() => {
    if (status === 'completed') {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  // Call onComplete when PDF is ready via WebSocket
  useEffect(() => {
    if (pdfUrl) {
      onComplete?.(pdfUrl);
    }
  }, [pdfUrl, onComplete]);

  // Calculate elapsed time
  const getElapsedTime = () => {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    const minutes = Math.floor(elapsed / 60);
    const seconds = elapsed % 60;
    return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  };

  // Get current progress message
  const getCurrentMessage = () => {
    const currentMessage = PROGRESS_MESSAGES
      .slice()
      .reverse()
      .find(msg => progress >= msg.min);
    return currentMessage?.message || PROGRESS_MESSAGES[0].message;
  };

  // Estimate remaining time (rough calculation)
  const getEstimatedRemaining = () => {
    if (progress > 0 && progress < 95) {
      const elapsed = (Date.now() - startTime) / 1000;
      const estimated = (elapsed / progress) * (100 - progress);
      const minutes = Math.floor(estimated / 60);
      return minutes > 0 ? `~${minutes}m remaining` : "Almost done!";
    }
    return "Almost done!";
  };

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header with connection status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div 
                className={`h-3 w-3 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-yellow-500'
                }`}
              />
              {isConnected && (
                <div className="absolute inset-0 h-3 w-3 bg-green-500 rounded-full animate-ping opacity-75" />
              )}
            </div>
            <div>
              <span className="text-sm font-medium text-gray-900">
                {isConnected ? 'Connected - Live Updates' : 'Connecting...'}
              </span>
              {connectionAttempts > 0 && !isConnected && (
                <p className="text-xs text-gray-500">
                  Reconnecting... (attempt {connectionAttempts}/5)
                </p>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-sm font-medium text-gray-900">
              Elapsed: {getElapsedTime()}
            </div>
            {progress > 0 && progress < 95 && (
              <div className="text-xs text-gray-500">
                {getEstimatedRemaining()}
              </div>
            )}
          </div>
        </div>

        {/* Manual check button when disconnected */}
        {!isConnected && status !== 'completed' && (
          <div className="flex justify-center">
            <button
              onClick={handleManualCheck}
              disabled={isCheckingStatus}
              className="flex items-center px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 transition-colors"
            >
              <ArrowPathIcon className={`h-4 w-4 mr-2 ${isCheckingStatus ? 'animate-spin' : ''}`} />
              {isCheckingStatus ? 'Checking...' : 'Check Status Manually'}
            </button>
          </div>
        )}
      </div>

      {/* Main progress section */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-8 border border-purple-100">
        {showCelebration && (
          <div className="text-center mb-6 animate-bounce">
            <div className="text-6xl mb-2">🎉</div>
            <div className="text-2xl font-bold text-purple-600 mb-1">
              Story Complete!
            </div>
            <div className="text-purple-500">Your magical adventure is ready!</div>
          </div>
        )}

        <div className="space-y-6">
          {/* Progress message */}
          <div className="text-center">
            <div className="text-2xl mb-2">
              {status === 'completed' ? '🌟' : '⏳'}
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {status === 'completed' 
                ? 'Your Story is Ready!' 
                : 'Creating Your Magical Story'
              }
            </h2>
            <p className="text-gray-600">
              {status === 'completed' 
                ? 'Time to read your personalized adventure!'
                : getCurrentMessage()
              }
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-3">
            <div className="flex justify-between text-sm font-medium">
              <span className="text-gray-700">Progress</span>
              <span className="text-purple-600">{progress}%</span>
            </div>
            
            <div className="relative">
              <div className="w-full bg-white rounded-full h-4 shadow-inner border border-gray-200">
                <div
                  className="bg-gradient-to-r from-purple-500 to-blue-500 h-4 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
                  style={{ width: `${progress}%` }}
                >
                  {/* Animated shimmer effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30 animate-pulse" />
                </div>
              </div>
              
              {/* Progress milestones */}
              <div className="flex justify-between mt-2">
                {[0, 25, 50, 75, 100].map((milestone) => (
                  <div key={milestone} className="flex flex-col items-center">
                    <div 
                      className={`w-3 h-3 rounded-full border-2 ${
                        progress >= milestone 
                          ? 'bg-purple-500 border-purple-500' 
                          : 'bg-white border-gray-300'
                      }`}
                    />
                    <span className="text-xs text-gray-500 mt-1">{milestone}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Status indicators */}
          <div className="flex justify-center space-x-8">
            <div className="flex items-center space-x-2">
              {status === 'completed' ? (
                <CheckCircleIcon className="h-5 w-5 text-green-500" />
              ) : (
                <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              )}
              <span className="text-sm font-medium text-gray-700">
                {status === 'completed' ? 'Complete' : 'In Progress'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Error handling */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <ExclamationTriangleIcon className="h-6 w-6 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-semibold text-red-900 mb-1">
                Something went wrong
              </h3>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-sm bg-red-100 text-red-800 px-4 py-2 rounded-lg hover:bg-red-200 transition-colors"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}