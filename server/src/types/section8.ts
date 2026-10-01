export type CounterStatus = 'AVAILABLE' | 'BUSY' | 'BREAK' | 'CLOSED';

export type AppointmentStatus =
  | 'BOOKED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'WAITING'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'MISSED'
  | 'RESCHEDULED'
  | 'DELAYED';

export type TokenStatus =
  | 'WAITING'
  | 'CALLED'
  | 'IN_SERVICE'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'MISSED'
  | 'CANCELLED';

// Section 8 Service Data
export interface ServiceEntity {
  id: string;
  name: string;
  code: string;
  tokenPrefix: string;
  departmentId: string;
  averageDuration: number;
  description?: string | null;
  dailyLimit?: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Section 8 Counter Data
export interface CounterEntity {
  id: string;
  counterNumber: string;
  departmentId: string;
  assignedStaffId?: string | null;
  serviceId?: string | null;
  currentTokenId?: string | null;
  status: CounterStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Section 8 Appointment Data
export interface AppointmentEntity {
  id: string;
  appointmentNumber: string;
  userId: string;
  serviceId: string;
  departmentId: string;
  appointmentDate: Date;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  checkInTime?: Date | null;
  notes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Section 8 Token Data
export interface TokenEntity {
  id: string;
  tokenNumber: string;
  userId?: string | null;
  serviceId: string;
  departmentId: string;
  counterId?: string | null;
  appointmentId?: string | null;
  queuePosition: number;
  estimatedWait: number;
  status: TokenStatus;
  isPriority: boolean;
  calledAt?: Date | null;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
