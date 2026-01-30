import { PendingAction } from '../types';

export interface FrontendAction {
  id: string;
  type: PendingAction['actionType'];
  description: string;
  details: PendingAction['params'];
  status: PendingAction['status'];
  timestamp: string;
}

export function toFrontendAction(action: PendingAction): FrontendAction {
  return {
    id: action.id,
    type: action.actionType,
    description: action.description,
    details: action.params,
    status: action.status,
    timestamp: action.createdAt,
  };
}
