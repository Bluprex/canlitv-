/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Channel {
  id: string;
  name: string;
  logo: string;
  streamUrl: string;
  streamFormat?: string;
  description?: string;
  category: string;
  type: 'tv' | 'radio';
  isDeleted?: boolean;
  createdAt?: any;
  updatedAt?: any;
  views?: number;
  watchTime?: number; // Total seconds watched by all users
}

export interface UserProfile {
  uid: string;
  displayName: string;
  photoURL?: string;
  favorites: string[]; // Channel IDs
}
