// app/types.ts
export interface User {
  id: string;
  handle: string;
  name: string;
  avatar: string;
  bio: string;
  followers: number;
  following: number;
  isPrivate: boolean;
  mutualText?: string;
  similarMusic?: string;
  category: 'suggested' | 'similar' | 'famous';
  topArtists?: string[];
  hashtags?: string[];
  liveHistory?: string[];
  age?: number;
  gender?: 'male' | 'female' | 'other';
}

export interface Comment {
  id: string;
  user: User;
  text: string;
}

export interface Song {
  id: string;
  trackId: number;
  title: string;
  artist: string;
  artistId?: number;
  imgUrl: string;
  previewUrl: string | null;
  date: string;
  year: number;
  month: number;
  dayIndex: number;
  timestamp: number;
  time: string;
  caption: string;
  user: User;
  likes: number;
  isLiked: boolean;
  comments: Comment[];
}

export interface FavoriteArtist {
  artistId: number;
  artistName: string;
  artworkUrl: string;
}

export interface Notification {
  id: string;
  type: 'follow' | 'like' | 'mention' | 'match' | 'vibe_request';
  text: string;
  time: string;
  read: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  isRead?: boolean; // 👈 これを追加
}

export interface ChatGroup {
  id: string;
  name: string;
  memberIds: string[];
  avatar: string;
}

export interface LiveCommunity {
  id: string;
  name: string;
  date: string;
  memberCount: number;
  isJoined: boolean;
  isVerified?: boolean; // 💡 公式マーク用
  reportedBy?: string[]; // 💡 通報したユーザーIDのリストを持たせる
}