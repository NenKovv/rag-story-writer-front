import { XMarkIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';

interface ErrorBannerProps {
  message: string;
  type?: 'error' | 'warning' | 'info';
  onDismiss?: () => void;
  onRetry?: () => void;
  details?: string;
}

export default function ImprovedErrorBanner({ 
  message, 
  type = 'error', 
  onDismiss, 
  onRetry, 
  details 
}: ErrorBannerProps) {
  const getStyles = () => {
    switch (type) {
      case 'warning':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          text: 'text-yellow-800',
          icon: 'text-yellow-500',
          button: 'text-yellow-600 hover:text-yellow-800'
        };
      case 'info':
        return {
          container: 'bg-blue-50 border-blue-200',
          text: 'text-blue-800',
          icon: 'text-blue-500',
          button: 'text-blue-600 hover:text-blue-800'
        };
      default:
        return {
          container: 'bg-red-50 border-red-200',
          text: 'text-red-800',
          icon: 'text-red-500',
          button: 'text-red-600 hover:text-red-800'
        };
    }
  };

  const styles = getStyles();
  
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <ExclamationTriangleIcon className={`h-5 w-5 ${styles.icon}`} />;
      case 'info':
        return <InformationCircleIcon className={`h-5 w-5 ${styles.icon}`} />;
      default:
        return <ExclamationTriangleIcon className={`h-5 w-5 ${styles.icon}`} />;
    }
  };

  const getErrorSuggestions = () => {
    const errorLower = message.toLowerCase();
    
    if (errorLower.includes('network') || errorLower.includes('connection')) {
      return "Please check your internet connection and try again.";
    }
    if (errorLower.includes('timeout')) {
      return "The request took too long. This might be due to high server load.";
    }
    if (errorLower.includes('invalid') || errorLower.includes('format')) {
      return "Please check that all required fields are filled correctly.";
    }
    if (errorLower.includes('server') || errorLower.includes('500')) {
      return "Our servers are experiencing issues. Please try again in a few minutes.";
    }
    return "If this problem persists, please try refreshing the page.";
  };

  return (
    <div className={`border rounded-xl p-4 ${styles.container} shadow-sm`} role="alert">
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        
        <div className="flex-grow min-w-0">
          <div className={`font-medium ${styles.text} mb-1`}>
            {type === 'error' && '⚠️ '}{message}
          </div>
          
          {type === 'error' && (
            <div className={`text-sm ${styles.text} opacity-80 mb-3`}>
              {getErrorSuggestions()}
            </div>
          )}
          
          {details && (
            <details className="mt-2">
              <summary className={`text-sm cursor-pointer ${styles.button} hover:underline`}>
                Technical details
              </summary>
              <div className={`mt-2 text-xs ${styles.text} opacity-70 font-mono bg-white bg-opacity-50 p-2 rounded border`}>
                {details}
              </div>
            </details>
          )}

          {onRetry && (
            <div className="mt-3 flex space-x-3">
              <button
                onClick={onRetry}
                className="text-sm bg-white bg-opacity-80 px-3 py-1 rounded-md border border-current hover:bg-opacity-100 transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            className={`flex-shrink-0 p-1 rounded-md ${styles.button} hover:bg-white hover:bg-opacity-50 transition-colors`}
            aria-label="Dismiss notification"
          >
            <XMarkIcon className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}