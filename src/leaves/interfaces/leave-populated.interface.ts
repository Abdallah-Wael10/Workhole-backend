import { User } from '../../users/users.schema';

export interface LeavePopulated {
  _id: string;
  userId: User;
  leaveType: 'Annual Leave' | 'Sick Leave' | 'Emergency Leave' | 'Unpaid Leave';
  startDate: Date;
  endDate: Date;
  days: number;
  reason: string;
  attachmentUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  actionBy?: User;
  actionNote?: string;
  actionDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}
