export interface User {
  'User ID': string;
  'Full Name': string;
  Email: string;
  Phone: string;
  'Shakha ID': string;
  'Shakha Name': string;
  Area: string;
  'Registration Date': string;
  'Last Login': string;
  'Account Status': string;
  Address?: string;
  Country?: string;
  'Emergency Contact'?: string;
  'GDPR Consent'?: string;
  'Consent Date'?: string;
  Role?: 'Participant' | 'Shakha Coordinator';
}

export interface Participant {
  'Participant ID': string;
  'Primary User ID': string;
  'Participant Name': string;
  Age: number | string;
  'Date of Birth'?: string;
  'Participant Type': 'Primary' | 'Family' | 'Guest';
  Relationship: string;
  Gender?: string;
  'Shakha ID': string;
  'Shakha Name': string;
  Area: string;
  'Active Status': string;
  'Created Date': string;
  Address?: string;
  Phone?: string;
  Email?: string;
  'Emergency Contact'?: string;
  'GDPR Consent'?: string;
  'Consent Date'?: string;
}

export interface Shakha {
  'Shakha ID': string;
  'Shakha Name': string;
  Area: string;
  City: string;
  Address: string;
  'Day of Week': string;
  'Start Time': string;
  'End Time': string;
  'Coordinator Name': string;
  'Coordinator Contact': string;
  'Active Status': string;
  Venue?: string;
  'Location Type'?: 'Indoor' | 'Outdoor';
  'Hall/Room Details'?: string;
  'Map Link'?: string;
  'Coordinator User ID'?: string;
}

export interface ScheduleEntry {
  'Schedule ID': string;
  'Shakha ID': string;
  'Shakha Name': string;
  Date: string;
  Day: string;
  'Start Time': string;
  'End Time': string;
  Location: string;
  Status: 'Scheduled' | 'Cancelled' | 'Completed' | 'Special Event';
  Notes: string;
  'Publish Status'?: 'Draft' | 'Published';
}

export interface ScheduleActivity {
  'Activity Row ID': string;
  'Schedule ID': string;
  Sequence: number | string;
  'Activity Time': string;
  'Activity Name': string;
  'Responsible Person': string;
  Remarks: string;
}

export type AttendanceResponse = 'Yes' | 'No' | 'Not Sure' | 'No Response';

export interface AttendanceRecord {
  'Attendance ID': string;
  'Schedule ID': string;
  'Shakha ID': string;
  'Shakha Name': string;
  'Shakha Date': string;
  'Participant ID': string;
  'Participant Name': string;
  'Primary User ID': string;
  'Attendance Response': AttendanceResponse;
  'Response Date/Time': string;
  'Last Updated': string;
}

export interface Activity {
  'Activity ID': string;
  'Activity Name': string;
  Description: string;
  Category: string;
  'Image/Thumbnail URL': string;
  'Repository Link': string;
  'Display Order': number;
  'Active Status': string;
}

export interface RepositoryResource {
  'Resource ID': string;
  'Resource Name': string;
  Category: string;
  Description: string;
  'Resource Type': string;
  URL: string;
  'Age Group': string;
  Language: string;
  'Display Order': number;
  'Active Status': string;
}

export interface DashboardBundle {
  user: User;
  shakha: Shakha | null;
  nextSchedule: ScheduleEntry | null;
  scheduleActivities: ScheduleActivity[];
  participants: Participant[];
  attendance: AttendanceRecord[];
  isCoordinator: boolean;
}

export interface CoordinatorSummary {
  totalParticipants: number;
  adults: number;
  children: number;
  male: number;
  female: number;
  families: number;
  newParticipants: number;
}

export interface CoordinatorDashboardBundle {
  shakha: Shakha;
  summary: CoordinatorSummary;
  nextSchedule: ScheduleEntry | null;
  nextShakhaAttendance: { going: number; maybe: number; notGoing: number; total: number };
  sessionsConducted: number;
  upcomingSessions: number;
}

export interface AdminSummary {
  totalUsers: number;
  totalParticipants: number;
  totalShakhas: number;
  totalAreas: number;
  confirmedForNextShakha: number;
  notAttending: number;
  notSure: number;
  noResponse: number;
}

export interface AreaOverviewRow {
  area: string;
  shakhas: number;
  participants: number;
  confirmed: number;
}

// --- Community Activities (My Shakha "Activities" card) ---
// Separate from `Activity` above, which is the home-page activity cards.

export interface CommunityActivity {
  'Activity ID': string;
  'Activity Name': string;
  'Type': string; // e.g. 'Reading Marathon'
  'Description': string;
  'Start Date': string;
  'End Date': string;
  'Shakha ID': string;
  'Status': 'Ongoing' | 'Historical'; // computed by the backend, not stored
}

export interface ActivityBook {
  'Book ID': string;
  'Activity ID': string;
  'Book Name': string;
  'Author': string;
  'Total Pages': string | number;
  'Added By User ID': string;
}

export interface ActivityLogEntry {
  'Log ID': string;
  'Activity ID': string;
  'User ID': string;
  'Participant ID': string;
  'Date/Time': string;
  'Book ID': string;
  'Chapter': string;
  'Pages Read': number;
  'Created Date': string;
}

export interface ActivityDetailBundle {
  activity: CommunityActivity;
  books: ActivityBook[];
}

// --- Activity Stats (Admin "Book Reading — Shakha Contribution" section) ---

export interface ShakhaActivityStats {
  shakhaId: string;
  shakhaName: string;
  participants: number;
  books: number;
  pagesRead: number;
  entries: number;
}

export interface ActivityStatsBundle {
  activity: CommunityActivity;
  overall: {
    totalParticipants: number;
    totalBooks: number;
    totalPagesRead: number;
    totalEntries: number;
    totalShakhas: number;
  };
  byShakha: ShakhaActivityStats[];
}
