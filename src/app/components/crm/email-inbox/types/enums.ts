// Enums for EmailInbox

export enum FolderType {
  INBOX = 'inbox',
  SENT = 'sent',
  TAGGED = 'tagged',
  CLIENTS = 'clients',
  ESCROWS = 'escrows',
}

export enum SentSubfolder {
  ALL = 'all',
  TRANSACTIONAL = 'transactional',
  MARKETING = 'marketing',
}

export enum EmailFilterType {
  ALL = 'all',
  UNREAD = 'unread',
  FAVORITES = 'favorites',
  ATTACHMENTS = 'attachments',
}

export enum EmailSortBy {
  DATE = 'date',
  SENDER = 'sender',
  SUBJECT = 'subject',
}

export enum SortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum EmailAction {
  REPLY = 'reply',
  FORWARD = 'forward',
  DELETE = 'delete',
  ARCHIVE = 'archive',
  FAVORITE = 'favorite',
  MARK_READ = 'mark_read',
  MARK_UNREAD = 'mark_unread',
  ADD_TAG = 'add_tag',
  REMOVE_TAG = 'remove_tag',
}
