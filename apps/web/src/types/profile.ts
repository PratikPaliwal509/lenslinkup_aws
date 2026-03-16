export interface Category {
  id:    string
  name:  string
  slug:  string
  emoji: string
}

export interface ProfileSummary {
  id:           string
  userId:       string
  displayName:  string
  title?:       string | null
  bio?:         string | null
  city?:        string | null
  state?:       string | null
  area?:        string | null
  avatarUrl?:   string | null
  isVerified:   boolean
  isPremium:    boolean
  avgRating?:   number
  reviewCount?: number
  categories:   Category[]
}
