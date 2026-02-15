// Shared types for Reading Circle

export interface UserResponse {
  id: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isTemporary: boolean;
  createdAt: string;
}

export interface BookResponse {
  id: string;
  title: string;
  author: string;
  introduction: string | null;
  addedBy: string;
  addedByUsername: string;
  createdAt: string;
  updatedAt: string;
  isRead: boolean;
  candidateCount: number;
}

export interface BookDetailResponse extends BookResponse {
  selectedInMeets: MeetSummary[];
  candidateInMeets: MeetSummary[];
  comments: BookCommentResponse[];
}

export interface BookCommentResponse {
  id: string;
  bookId: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

export interface MeetSummary {
  id: string;
  label: string;
  phase: MeetPhase;
  selectedDate: string | null;
}

export type MeetPhase = 'draft' | 'voting' | 'reading' | 'completed' | 'cancelled';

export interface MeetResponse {
  id: string;
  hostId: string;
  hostUsername: string;
  phase: MeetPhase;
  selectedBookId: string | null;
  selectedBookTitle: string | null;
  selectedDate: string | null;
  location: string | null;
  description: string | null;
  votingPointsRevealed: boolean;
  label: string;
  createdAt: string;
  updatedAt: string;
}

export interface MyVoteResponse {
  candidateId: string;
  points: number;
}

export interface MeetDetailResponse extends MeetResponse {
  candidates: CandidateResponse[];
  dateOptions: DateOptionResponse[];
  top5Entries: Top5EntryResponse[];
  voteStatus: VoteStatusResponse[];
  myVotes: MyVoteResponse[];
}

export interface CandidateResponse {
  id: string;
  meetId: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  motivation: string | null;
  addedBy: string;
  addedByUsername: string;
  alreadySelectedInMeet: boolean;
  points?: number; // only visible after reveal
}

export interface DateOptionResponse {
  id: string;
  meetId: string;
  dateTime: string;
  votes: DateVoteResponse[];
}

export interface DateVoteResponse {
  userId: string;
  username: string;
  availability: AvailabilityStatus;
}

export type AvailabilityStatus = 'available' | 'not_available' | 'maybe' | 'no_response';

export interface VoteStatusResponse {
  userId: string;
  username: string;
  hasVoted: boolean;
}

export interface Top5EntryResponse {
  id: string;
  meetId: string;
  userId: string;
  username: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  rank: number;
}

export interface AggregatedRankingResponse {
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  totalPoints: number;
  appearances: number;
}

export interface InvitationResponse {
  id: string;
  email: string;
  invitedBy: string;
  invitedByUsername: string;
  expiresAt: string;
  used: boolean;
  createdAt: string;
}

// Request types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  token: string;
  username: string;
  password: string;
}

export interface SetupRequest {
  username: string;
  password: string;
  email: string;
}

export interface CreateBookRequest {
  title: string;
  author: string;
  introduction?: string;
}

export interface CreateMeetRequest {
  location?: string;
  description?: string;
}

export interface UpdateMeetRequest {
  location?: string;
  description?: string;
  selectedBookId?: string | null;
  selectedDate?: string | null;
}

export interface AddCandidateRequest {
  bookId: string;
  motivation?: string;
}

export interface SubmitVotesRequest {
  votes: { candidateId: string; points: number }[];
}

export interface SubmitDateVoteRequest {
  votes: { dateOptionId: string; availability: AvailabilityStatus }[];
}

export interface SubmitTop5Request {
  entries: { bookId: string; rank: number }[];
}

export const PASSWORD_REQUIREMENTS = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  description: 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character (!@#$%^&*)',
};

export const VOTING_POINTS_TOTAL = 15;
