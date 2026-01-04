export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  tags: string[];
  isFavorite: boolean;
  createdAt: Date;
  eventName?: string;
}

export interface PhotoFilter {
  type: 'all' | 'my';
  userTag?: string;
}
