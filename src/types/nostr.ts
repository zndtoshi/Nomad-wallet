/**
 * Nostr Protocol Types
 */

export interface NostrEvent {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

export interface NostrKeys {
  privateKey: string;
  publicKey: string;
}

export interface NostrProfile {
  name?: string;
  about?: string;
  picture?: string;
  nip05?: string;
  lud16?: string; // Lightning address
}

export interface NostrRelay {
  url: string;
  read: boolean;
  write: boolean;
}

export interface NostrContact {
  pubkey: string;
  relay?: string;
  petname?: string;
}

// Event Kinds
export enum NostrKind {
  Metadata = 0,
  Text = 1,
  RecommendRelay = 2,
  Contacts = 3,
  EncryptedDirectMessage = 4,
  EventDeletion = 5,
  Repost = 6,
  Reaction = 7,
  ChannelCreation = 40,
  ChannelMetadata = 41,
  ChannelMessage = 42,
  ChannelHideMessage = 43,
  ChannelMuteUser = 44,
}

