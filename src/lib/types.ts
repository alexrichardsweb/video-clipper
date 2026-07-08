export type Clip = {
  id: string;
  start: string; // HH:MM:SS
  end: string; // HH:MM:SS
  name: string;
  includeInMerge: boolean;
};

export type ClipDraft = {
  startSeconds?: number;
  endSeconds?: number;
  name: string;
};
