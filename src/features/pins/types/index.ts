export type PinEntityType = 'project' | 'task' | 'conversation';

export interface UserPin {
  id: string;
  userId: string;
  entityType: PinEntityType;
  entityId: string;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}
