// Enums for contacts module - replaces magic strings

export enum ContactStatus {
  UNCONTACTED = 'uncontacted',
  CONTACTED = 'contacted',
  QUALIFIED = 'qualified',
  NURTURING = 'nurturing',
  CLIENT = 'client',
  INACTIVE = 'inactive'
}

export enum ContactAgeFilter {
  ALL = 'all',
  RECENT = 'recent',
  OLD = 'old',
  ANCIENT = 'ancient'
}

export enum FilterBy {
  ALL = 'all',
  NO_EMAIL = 'no-email',
  NO_PHONE = 'no-phone',
  NO_ADDRESS = 'no-address',
  BUYERS = 'buyers',
  SELLERS = 'sellers'
}

export enum SortBy {
  A_TO_Z = 'a-z',
  Z_TO_A = 'z-a',
  NEWEST = 'newest',
  OLDEST = 'oldest',
  STATUS = 'status'
}

export enum ViewMode {
  CARD = 'card',
  LIST = 'list'
}

export enum ContactAge {
  RECENT = 'recent',  // 0-30 days
  OLD = 'old',        // 31-365 days
  ANCIENT = 'ancient' // 365+ days
}
