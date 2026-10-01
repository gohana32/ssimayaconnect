export type BookingDetails = {
  fullName: string;
  email: string;
  mobile: string;
  countryCode?: string;
  [key: string]: string | undefined;
};

export type AttendanceStatus = 'NOT_PRESENT' | 'PRESENT';

export type ServerBooking = {
  id: string;
  bookingId: string;
  eventId: string;
  attendanceStatus: AttendanceStatus;
  checkedInAt: string | null;
};

export type BookingApiResponse = {
  success?: boolean;
  existing?: boolean;
  error?: string;
  message?: string;
  booking?: ServerBooking;
};

export const ticketStorage = {
  mobile: 'ssi-my-tickets-mobile',
  email: 'ssi-my-tickets-email',
  tickets: 'ssi-my-tickets-data',
  events: 'ssi-events-cache',
} as const;

export const bookingStorage = {
  details: (eventId: string) => `ssi-booking-details:${eventId}`,
  draft: (eventId: string) => `ssi-booking-draft:${eventId}`,
};
