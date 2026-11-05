/** 创作方向 */
export type CreationDirection =
  | 'emotion'
  | 'opinion'
  | 'story'
  | 'resonance'
  | 'contrarian'
  | 'controversy'
  | 'question'
  | 'experience'

/** 创作风格 */
export type CreationStyle =
  | 'authentic'
  | 'warm'
  | 'restrained'
  | 'sharp'
  | 'humorous'
  | 'plain'
  | 'colloquial'
  | 'storytelling'

/** 内容长度 */
export type ContentLength = 'short' | 'medium' | 'long'

/** 生成任务状态 */
export type GenerationStatus =
  | 'pending'
  | 'planning'
  | 'generating'
  | 'reviewing'
  | 'completed'
  | 'failed'
  | 'cancelled'

/** 讨论引导类型 */
export type DiscussionHookType = 'question' | 'choice' | 'controversy' | 'experience' | 'self'

export interface DiscussionHook {
  type: DiscussionHookType
  content: string
  score: number
  recommended: boolean
}

export interface ContentScore {
  title: number
  emotion: number
  completeness: number
  originality: number
  authenticity: number
  opinion: number
  discussion: number
  total: number
}

export interface Content {
  id: string
  title: string
  content: string
  keyword: string
  directions: CreationDirection[]
  styles: CreationStyle[]
  topicAngle: string
  discussionHooks: DiscussionHook[]
  score: ContentScore
  personaId?: string
  templateId?: string
  createdAt: string
  updatedAt: string
  favorite: boolean
  status?: 'pending' | 'generating' | 'completed' | 'failed'
  errorMessage?: string
  coverImageId?: string
  imageQuery?: string
  coverImage?: ContentCoverImage
  images?: ContentCoverImage[]
}

export interface ContentCoverImage {
  id: string
  provider: string
  photographer: string
  attribution: string
  sourcePageUrl: string
  previewUrl: string
  thumbUrl: string
  downloadUrl?: string
}

export interface ImageCandidate {
  provider: 'unsplash' | 'pexels' | 'pixabay'
  providerId: string
  thumbUrl: string
  previewUrl: string
  downloadUrl: string
  width: number
  height: number
  photographer: string
  photographerUrl: string
  sourcePageUrl: string
  license: string
  attribution: string
  /** Unsplash 合规：下载时需触发 download_location */
  downloadLocation?: string
}

export interface ImageSettings {
  provider: 'unsplash' | 'pexels' | 'pixabay'
  unsplashApplicationId: string
  unsplashAccessKey: string
  unsplashSecretKey: string
  pexelsApiKey: string
  pixabayApiKey: string
}

export interface Persona {
  id: string
  name: string
  identity: string
  age: string
  occupation: string
  lifeBackground: string
  familyBackground: string
  personality: string
  languageStyle: string
  values: string
  goodAtTopics: string
  badAtTopics: string
  forbiddenExpressions: string
  commonWords: string
  bannedWords: string
  isDefault?: boolean
}

export interface ContentTemplate {
  id: string
  name: string
  description: string
  structure: string[]
  isBuiltin: boolean
  createdAt?: string
  updatedAt?: string
}

export interface CreationFormState {
  keyword: string
  directions: CreationDirection[]
  styles: CreationStyle[]
  emotionIntensity: number
  opinionIntensity: number
  controversyLevel: number
  count: number
  length: ContentLength
  personaId: string
  templateId: string
}

export interface GenerationTask {
  id: string
  status: GenerationStatus
  progress: number
  total: number
  completed: number
  currentStep: string
  contents: Content[]
  form: CreationFormState
  createdAt: string
  errorMessage?: string
}

export type AIProviderType = 'openai' | 'anthropic' | 'deepseek' | 'openai-compatible'

export interface AISettings {
  provider: AIProviderType
  apiKey: string
  baseUrl: string
  model: string
  temperature: number
  maxTokens: number
}

export interface TopicPlan {
  angle: string
  topic: string
  core_conflict: string
  target_emotion: string
}
