export const PARTICIPATION_CATEGORIES = ['Shishu', 'Bal', 'Kishore', 'Tarun', 'Praudh', 'Jestha'] as const;

export type ParticipationCategory = (typeof PARTICIPATION_CATEGORIES)[number];

export const PARTICIPATION_CATEGORY_LABELS: Record<ParticipationCategory, string> = {
  Shishu: 'Shishu Swayamsevak',
  Bal: 'Bal Swayamsevak',
  Kishore: 'Kishore Swayamsevak',
  Tarun: 'Tarun Swayamsevak',
  Praudh: 'Praudh',
  Jestha: 'Jestha (Jyeshtha)',
};

export const PARTICIPATION_CATEGORY_AGE_RANGES: Record<ParticipationCategory, string> = {
  Shishu: 'Up to 10 years',
  Bal: '10 to 14 years',
  Kishore: '14 to 18 years',
  Tarun: '18 to 25 years',
  Praudh: '25 to 55 years',
  Jestha: 'Above 55 years',
};
