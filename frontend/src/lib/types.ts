export type Role = 'admin' | 'viewer';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export interface LoginResponse {
  token: string;
  user: User;
  expiresAt: string;
}

export interface LogFile {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  etag?: string;
}

export interface ListLogsResponse {
  files: LogFile[];
  isTruncated: boolean;
  nextMarker: string | null;
}

export interface PresignResponse {
  url: string;
  expiresAt: string;
  key: string;
}