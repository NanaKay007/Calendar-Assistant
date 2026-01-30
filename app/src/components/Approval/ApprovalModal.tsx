import type { PendingAction } from '../../types';

interface ApprovalModalProps {
  action: PendingAction;
  onApprove: (actionId: string) => void;
  onReject: (actionId: string) => void;
  onClose: () => void;
}

export function ApprovalModal({ action, onApprove, onReject, onClose }: ApprovalModalProps) {
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'create_event':
        return (
          <svg
            className="w-12 h-12 text-blue-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
        );
      case 'update_event':
        return (
          <svg
            className="w-12 h-12 text-yellow-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        );
      case 'delete_event':
        return (
          <svg
            className="w-12 h-12 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        );
      default:
        return (
          <svg
            className="w-12 h-12 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        );
    }
  };

  const getActionTitle = (type: string) => {
    switch (type) {
      case 'create_event':
        return 'Create New Event';
      case 'update_event':
        return 'Update Event';
      case 'delete_event':
        return 'Delete Event';
      default:
        return 'Pending Action';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return dateString;
    }
    return date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const renderActionDetails = () => {
    const details = action.details;

    const title = 'summary' in details ? details.summary : undefined;
    const startTime = 'startDateTime' in details ? details.startDateTime : undefined;
    const endTime = 'endDateTime' in details ? details.endDateTime : undefined;

    return (
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        {title && (
          <div>
            <span className="text-sm font-medium text-gray-700">Title:</span>
            <p className="text-sm text-gray-900 mt-1">{title}</p>
          </div>
        )}
        {startTime && (
          <div>
            <span className="text-sm font-medium text-gray-700">Start:</span>
            <p className="text-sm text-gray-900 mt-1">{formatDate(startTime)}</p>
          </div>
        )}
        {endTime && (
          <div>
            <span className="text-sm font-medium text-gray-700">End:</span>
            <p className="text-sm text-gray-900 mt-1">{formatDate(endTime)}</p>
          </div>
        )}
        {'location' in details && details.location && (
          <div>
            <span className="text-sm font-medium text-gray-700">Location:</span>
            <p className="text-sm text-gray-900 mt-1">{details.location}</p>
          </div>
        )}
        {'description' in details && details.description && (
          <div>
            <span className="text-sm font-medium text-gray-700">Description:</span>
            <p className="text-sm text-gray-900 mt-1">{details.description}</p>
          </div>
        )}
        {'calendarId' in details && details.calendarId && (
          <div>
            <span className="text-sm font-medium text-gray-700">Calendar ID:</span>
            <p className="text-sm text-gray-500 mt-1 font-mono">{details.calendarId}</p>
          </div>
        )}
        {'eventId' in details && details.eventId && (
          <div>
            <span className="text-sm font-medium text-gray-700">Event ID:</span>
            <p className="text-sm text-gray-500 mt-1 font-mono">{details.eventId}</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {getActionIcon(action.type)}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {getActionTitle(action.type)}
                </h2>
                <p className="text-gray-600 mt-1">Review and approve this action</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-blue-500"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-blue-700">{action.description}</p>
                </div>
              </div>
            </div>

            <h3 className="text-sm font-semibold text-gray-900 mb-3">Action Details</h3>
            {renderActionDetails()}
          </div>

          <div className="flex items-center justify-end gap-3 pt-6 border-t border-gray-200">
            <button
              onClick={() => onReject(action.id)}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors font-medium"
            >
              Reject
            </button>
            <button
              onClick={() => onApprove(action.id)}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              <span>Approve & Execute</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
