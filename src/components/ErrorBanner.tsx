import { XMarkIcon } from '@heroicons/react/24/outline';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

// Function to convert technical errors to child-friendly messages
function getFriendlyErrorMessage(error: string): { title: string; message: string; emoji: string; suggestion?: string } {
  const lowerError = error.toLowerCase();
  
  // Network/Connection errors
  if (lowerError.includes('fetch') || lowerError.includes('network') || lowerError.includes('connection')) {
    return {
      emoji: '🌐',
      title: "Can't Connect to Story Magic",
      message: "It looks like there's a problem connecting to our story workshop.",
      suggestion: "Check your internet connection and try again!"
    };
  }
  
  // Timeout errors
  if (lowerError.includes('timeout') || lowerError.includes('request timeout')) {
    return {
      emoji: '⏰',
      title: "Story Taking Too Long",
      message: "Our magical story creators are a bit busy right now.",
      suggestion: "Please wait a moment and try creating your story again!"
    };
  }
  
  // Server errors (500, 502, 503, etc.)
  if (lowerError.includes('api error: 5') || lowerError.includes('server error')) {
    return {
      emoji: '🔧',
      title: "Story Workshop is Being Fixed",
      message: "Our story elves are working hard to fix something in the workshop.",
      suggestion: "Try again in a few minutes - they work super fast!"
    };
  }
  
  // Rate limiting or too many requests
  if (lowerError.includes('429') || lowerError.includes('too many')) {
    return {
      emoji: '🐌',
      title: "Slow Down, Super Creator!",
      message: "You're creating stories so fast that our magical workshop needs a little break.",
      suggestion: "Wait a few minutes, then try creating your next masterpiece!"
    };
  }
  
  // Validation or bad request errors
  if (lowerError.includes('400') || lowerError.includes('bad request') || lowerError.includes('validation')) {
    return {
      emoji: '📝',
      title: "Story Details Need a Little Help",
      message: "Some of your story details might need to be adjusted.",
      suggestion: "Check your story title, character name, and other details, then try again!"
    };
  }
  
  // Generic/Unknown errors
  return {
    emoji: '🤔',
    title: "Something Unexpected Happened",
    message: "Don't worry! Even the most magical workshops have little hiccups sometimes.",
    suggestion: "Try creating your story again - it usually works perfectly the second time!"
  };
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  const friendlyError = getFriendlyErrorMessage(message);
  
  return (
    <div className="bg-gradient-to-r from-red-50 via-orange-50 to-yellow-50 border-l-4 border-orange-400 rounded-r-lg p-4 shadow-sm">
      <div className="flex items-start">
        <div className="flex-shrink-0 mr-3">
          <span className="text-2xl">{friendlyError.emoji}</span>
        </div>
        <div className="flex-grow">
          <h4 className="text-orange-800 font-semibold text-sm mb-1">
            {friendlyError.title}
          </h4>
          <p className="text-orange-700 text-sm mb-2">
            {friendlyError.message}
          </p>
          {friendlyError.suggestion && (
            <div className="bg-orange-100 rounded-md p-2 mt-2">
              <p className="text-orange-800 text-xs font-medium flex items-center">
                <span className="mr-1">💡</span>
                {friendlyError.suggestion}
              </p>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            className="ml-4 text-orange-400 hover:text-orange-600 transition-colors"
            onClick={onDismiss}
            aria-label="Close error message"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}