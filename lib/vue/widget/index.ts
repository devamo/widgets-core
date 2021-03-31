/* eslint-disable @typescript-eslint/no-unused-vars */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { decode } from 'jsonwebtoken'
import { createAxios, SuperAxios } from '../../axios'
import { WebSockets, WebSocketsOptions } from '../../sockets'
import types from './types'

export type AmoWidget = types.AmoWidget
export type VueWidgetOptions = types.WidgetClassOptions
export type WidgetClassInstance = types.WidgetClassInstance

export type HubAccessRule = types.HubAccessRule
export type HubTab = types.HubTab
export enum HubTabsStrategy {
  REPLACE = 'replace',
  ADD = 'add'
}

export class VueWidget implements WidgetClassInstance {
  public source = ''
  public alias = ''
  public productId = ''
  public extra: any

  public amoWidget: AmoWidget | null
  public hub?: WidgetClassInstance

  public api: SuperAxios

  public window = window as any

  private apiBaseUrl: string
  private proxyBaseUrl: string
  private wsBaseUrl: string
  private disposableToken: string | null = null
  private disposableDecoded: any | null = null

  constructor(opts: VueWidgetOptions) {
    this.source = opts.source || 'public'
    this.alias = opts.alias || 'devio'
    this.productId = opts.productId || ''
    this.amoWidget = opts.amoWidget || null
    this.extra = opts.extra || {}
    this.proxyBaseUrl = opts.proxyBaseUrl || 'https://proxy.amodev.ru'
    this.apiBaseUrl = opts.apiBaseUrl || 'https://api.amodev.ru'
    this.wsBaseUrl = opts.wsBaseUrl || 'wss://wss.amodev.ru'

    if (this.amoWidget) {
      Object.assign(this.amoWidget, { callbacks: this.callbacks() })
    }

    if (this.source === 'hub') {
      if (!opts.hub) {
        throw new Error('Для инициализации из хаба - hub обязателен в опциях')
      }

      this.hub = opts.hub
    }

    this.api = this.createAxios(this.apiBaseUrl)
  }

  createSockets(opts?: Partial<WebSocketsOptions>) {
    opts = opts || {}

    const wsUrl = opts.wsUrl || this.wsBaseUrl

    const props: WebSocketsOptions = {
      wsUrl,
      needAuth: opts.needAuth || false,
      actions: opts.actions || {},
      autoConnect: opts.autoConnect || false,

      axios: this.createAxios(wsUrl.replace('ws://', 'http://').replace('wss://', 'https://'))
    }

    if (props.needAuth) {
      props.tokenRequest = async () => {
        return this.getDisposable(this.source === 'hub' ? 'devio-hub' : this.alias)
      }
    }

    return new WebSockets(props)
  }

  createAxios(
    config: string | AxiosRequestConfig,
    opts: { auth?: boolean; authHeader?: string; authTokenType?: string } = {}
  ): SuperAxios {
    opts = Object.assign(
      {
        auth: true,
        authHeader: 'Authorization',
        authTokenType: 'Disposable'
      },
      opts
    )

    const props: any = {
      props: typeof config === 'string' ? { baseURL: config } : config
    }

    if (opts.auth) {
      props.interceptor = (config: any) => {
        if (this.disposableToken) {
          config.headers[opts.authHeader!] = `${opts.authTokenType!} ${this.disposableToken}`
        }
      }

      props.beforeRequest = async () => {
        await this.getDisposable(this.source === 'hub' ? 'devio-hub' : this.alias)
      }
    }

    return createAxios(props)
  }

  async getDisposable(alias: string): Promise<string | null> {
    try {
      let jwtExpired = false
      let jwtNotExists = true

      // если есть в localStorage но нет у нас
      if (localStorage[`${alias}-disposableToken`] && !this.disposableToken) {
        this.disposableToken = localStorage[`${alias}-disposableToken`]
        this.disposableDecoded = decode(this.disposableToken as string)
      }

      if (this.disposableDecoded) {
        // console.log('Текущий disposable', this.disposableDecoded)

        jwtNotExists = false
        jwtExpired = Date.now() - 1000 * 10 >= +this.disposableDecoded.exp * 1000
      }

      if (jwtNotExists || jwtExpired) {
        // console.log(`jwt ${jwtNotExists ? 'not exists' : 'expired'}, refreshing...`)

        // пытаемся запросить disposable
        try {
          const response = await fetch(
            `/ajax/v2/integrations/${this.amoWidget?.params.oauth_client_uuid}/disposable_token`,
            {
              method: 'GET',
              credentials: 'include',
              headers: {
                'X-Requested-With': 'XMLHttpRequest'
              }
            }
          )
          const { token } = await response.json()

          if (!token) {
            throw new Error('Не удалось получить токен')
          }

          localStorage[`${alias}-disposableToken`] = token
          this.disposableToken = token
          this.disposableDecoded = decode(token)
        } catch (e) {
          console.error(`error while refreshing token: ${e.message}`)
          console.log(e)

          this.disposableToken = null
          this.disposableDecoded = null
        }
      }
    } catch (e) {
      console.error(`error on beforeRequest: ${e.message}`)
      console.log(e)

      this.disposableToken = null
      this.disposableDecoded = null
    }

    return this.disposableToken
  }

  callbacks(): any {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    const errLog = (action: string, e: any) => {
      return `[${this.productId}] Ошибка при выполнении ${action}: ${e.message}`
    }

    return {
      init: () => true,
      render: function () {
        const isAdvanced =
          window.location.pathname.indexOf(
            '/settings/widgets/' + that.amoWidget?.params.widget_code + '/'
          ) === 0

        if (isAdvanced) {
          if (!that.window.AMOCRM.first_load) {
            that
              .init()
              .then(() => {
                try {
                  that.render().catch((e) => errLog('advanced', e))
                } catch (e) {
                  errLog('advanced', e)
                }
              })
              .catch((e) => errLog('init', e))
          }
        } else {
          that
            .init()
            .then(() => {
              try {
                that.render().catch((e) => errLog('render', e))
              } catch (e) {
                errLog('render', e)
              }
            })
            .catch((e) => errLog('init', e))
        }

        return true
      },
      advancedSettings: function () {
        if (that.window.AMOCRM.first_load) {
          that
            .init()
            .then(() => {
              try {
                that.render().catch((e) => errLog('render', e))
              } catch (e) {
                errLog('render', e)
              }
            })
            .catch((e) => errLog('init', e))
        }

        return true
      },
      bind_actions: function () {
        try {
          that.bindActions()
        } catch (e) {
          errLog('bind_actions', e)
        }

        return true
      },
      onSave: function () {
        try {
          that.onSave()
        } catch (e) {
          errLog('onSave', e)
        }

        return true
      },
      settings(modal: any) {
        try {
          const settingsWrap = modal[0].querySelector('#widget_settings__fields_wrapper')
          if (settingsWrap) {
            settingsWrap.style.display = 'none'
          }

          const settingDescr = modal[0].querySelector('.widget_settings_block__descr')
          if (settingDescr) {
            settingDescr.style.display = 'none'
          }

          const settingDescrExp = modal[0].querySelector('.widget-settings-block__desc-expander')
          if (settingDescrExp) {
            settingDescrExp.style.display = 'none'
          }
        } catch (e) {
          console.error(e)
        }

        try {
          that.settings(modal)
        } catch (e) {
          errLog('settings', e)
        }

        return true
      },
      initMenuPage() {
        const isOurWidgetPage =
          window.location.pathname.indexOf(
            `widget_page/${that.amoWidget?.params.widget_code}/main/list`
          ) === 1

        if (!isOurWidgetPage) {
          return true
        } else {
          try {
            that.initMenuPage()
          } catch (e) {
            errLog('initMenuPage', e)
          }

          return true
        }
      },
      async loadPreloadedData() {
        let data = []

        try {
          data = await that.loadPreloadedData()
        } catch (e) {
          errLog('loadPreloadedData', e)
        }

        return data
      },
      async loadElements() {
        let data = []

        try {
          data = await that.loadElements()
        } catch (e) {
          errLog('loadElements', e)
        }

        return data
      },
      async searchDataInCard() {
        let data = []

        try {
          data = await that.searchDataInCard()
        } catch (e) {
          errLog('searchDataInCard', e)
        }

        return data
      },
      async linkCard() {
        let ret = true

        try {
          ret = await that.linkCard()
        } catch (e) {
          errLog('linkCard', e)
        }

        return ret
      }
    }
  }

  async proxy<T>(props: AxiosRequestConfig): Promise<AxiosResponse<T>> {
    return axios.post<T>(this.proxyBaseUrl, props)
  }

  async hubAccessRules(): Promise<HubAccessRule[]> {
    return []
  }

  async hubTabs(): Promise<{ strategy: HubTabsStrategy; tabs?: HubTab[] } | undefined> {
    return undefined
  }

  /* amo methods */
  async init(): Promise<void> {
    console.log('Method "init" not implemented')
  }

  async render(): Promise<void> {
    console.log('Method "render" not implemented')
  }

  async bindActions(): Promise<any> {
    console.log('Method "bindActions" not implemented')
  }

  async onSave(): Promise<any> {
    console.log('Method "onSave" not implemented')
  }

  async settings(modal: any): Promise<any> {
    console.log('Method "settings" not implemented')
  }

  async initMenuPage(): Promise<any> {
    console.log('Method "initMenuPage" not implemented')
  }

  async loadPreloadedData(): Promise<any> {
    console.log('Method "loadPreloadedData" not implemented')
  }

  async loadElements(): Promise<any> {
    console.log('Method "loadPreloadedData" not implemented')
  }

  async searchDataInCard(): Promise<any> {
    console.log('Method "searchDataInCard" not implemented')
  }

  async linkCard(): Promise<boolean> {
    console.log('Method "linkCard" not implemented')
    return true
  }
}
