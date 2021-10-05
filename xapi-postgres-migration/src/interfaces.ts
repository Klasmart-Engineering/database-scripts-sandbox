export interface XApiRecord {
  userId?: string
  serverTimestamp?: number
  ipHash?: string
  xapi?: XApiObject
}

export interface XApiObject {
  clientTimestamp?: number
  data?: {
    statement?: {
      verb?: { display?: { [indexer: string]: string | undefined } }
      object?: {
        definition?: {
          name?: { [indexer: string]: string | undefined }
          extensions?: { [indexer: string]: string | undefined }
        }
      }
      context?: {
        contextActivities?: {
          category?: [{ id?: string }]
          parent?: [{ id?: string }]
        }
      }
      result?: {
        score?: {
          min?: number
          max?: number
          raw?: number
          scaled?: number
        }
        response?: string
      }
    }
  }
}
