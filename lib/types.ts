// --- Add these to lib/types.ts, alongside the CommunityActivity types ---

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
