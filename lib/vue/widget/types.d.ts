import { SuperAxios } from '../../../lib/axios'

export type AmoWidgetParams = {
  id?: number
  active: 'Y' | 'N'
  config: any
  images_path: string
  oauth_client_uuid: string
  path: string
  status: 'install'
  support: any[]
  version: any
  widget_active: 'Y' | 'N'
  widget_code: string
}

export type AmoWidget = {
  callbacks: {
    advancedSettings?: () => boolean
    bind_actions?: () => boolean
    init?: () => boolean
    initMenuPage?: () => boolean
    linkCard?: () => Promise<boolean>
    loadPreloadedData?: () => Promise<any[]>
    loadElements?: () => Promise<any[]>
    searchDataInCard?: () => Promise<any[]>
    onSave?: () => boolean
    render?: () => boolean
    settings?: (modal: any) => boolean
  }
  params: AmoWidgetParams
  init_once: 'N' | 'Y'
  langs: any
  modal?: any
  system: () => {
    amohash: string
    amouser: string
    amouser_id: string
    area: string
    domain: string
    server: string
    subdomain: string
  }
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
