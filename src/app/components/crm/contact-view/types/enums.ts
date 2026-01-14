// Enums for ContactViewPanel

export enum ContactViewTab {
  OVERVIEW = 'overview',
  PROPERTIES = 'properties',
  NOTES = 'notes',
  ACTIVITY = 'activity',
}

export enum ContactInfoField {
  PHONE = 'phone',
  EMAIL = 'email',
  ADDRESS = 'address',
  ORGANIZATION = 'organization',
}

export enum ContactPhotoUploadStatus {
  IDLE = 'idle',
  UPLOADING = 'uploading',
  SUCCESS = 'success',
  ERROR = 'error',
}

export enum NoteAction {
  CREATE = 'create',
  EDIT = 'edit',
  DELETE = 'delete',
  EXPAND = 'expand',
  COLLAPSE = 'collapse',
}
