import React from 'react';
import { useTaskWebSocket } from '../hooks/useTaskWebSocket.js';
import { fetchTaskStatus } from '../api/api.js';

interface TaskStatusProps {
  taskId: string;
  onComplete?: (pdfUrl: string) => void;
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
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div 
            className={`h-2.5 w-2.5 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`} 
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
            className="text-sm px-4 py-1 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCheckingStatus ? 'Checking...' : 'Check Status'}
          </button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Generation Progress</span>
          <span>{progress}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div
            className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {status === 'completed' && (
        <div className="text-center text-green-600">
          Story generation completed!
        </div>
      )}
    </div>
  );
}