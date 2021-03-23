import { SuperAxios } from '../../../lib/axios'

export type AmoWidget = {
  callbacks: any
  params: any
}

export type AmoPage = 'advanced' | ''

export type WidgetClassOptions = {
  alias: string
  productId?: string
  amoWidget?: AmoWidget

  source?: 'public' | 'hub'
  proxyBaseUrl?: string
  apiBaseUrl?: string

  extra?: any
}

export interface WidgetClassInstance {
  readonly proxy: SuperAxios
  readonly api: SuperAxios

  init(page: AmoPage): Promise<void>
  render(page: AmoPage): Promise<void>
}
