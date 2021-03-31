import { AxiosRequestConfig, AxiosResponse } from 'axios'
import { SuperAxios } from '../../axios'

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

export type WidgetClassOptions = {
  alias: string
  productId?: string
  amoWidget?: AmoWidget
  hub?: WidgetClassInstance

  source?: 'public' | 'hub'
  proxyBaseUrl?: string
  apiBaseUrl?: string
  wsBaseUrl?: string

  extra?: any
}

export interface WidgetClassInstance {
  readonly api: SuperAxios

  alias: string
  productId: string
  extra: any
  window: any

  amoWidget: AmoWidget | null
  hub?: WidgetClassInstance

  proxy<T>(opts: AxiosRequestConfig): Promise<AxiosResponse<T>>
  hubTabs(): Promise<{ strategy: HubTabsStrategy; tabs?: HubTab[] } | undefined>
  hubAccessRules(): Promise<HubAccessRule[] | undefined>

  init(): Promise<void>
  render(): Promise<void>
}

export enum HubTabsStrategy {
  REPLACE = 'replace',
  ADD = 'add'
}

export type HubAccessRule = {
  title: string
  alias: string
}

export type HubTab = {
  title: string
  alias: string
  callback: (el: HTMLElement, tab: HubTab, widget: WidgetClassInstance) => Promise<any>
}
