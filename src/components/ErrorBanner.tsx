import { XMarkIcon } from '@heroicons/react/24/outline';

interface ErrorBannerProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorBanner({ message, onDismiss }: ErrorBannerProps) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-md p-4">
      <div className="flex items-start">
        <div className="flex-grow">
          <p className="text-sm text-red-700">{message}</p>
        </div>
        {onDismiss && (
          <button
            className="ml-4 text-red-400 hover:text-red-500"
            onClick={onDismiss}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}