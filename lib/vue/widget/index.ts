/* eslint-disable @typescript-eslint/no-unused-vars */
import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import { decode } from 'jsonwebtoken'
import { createAxios, SuperAxios } from '../../axios'
import { WebSockets, WebSocketsOptions } from '../../sockets'
import moment from 'moment'
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
  private clearSettings: boolean

  private initFired = false

  constructor(opts: VueWidgetOptions) {
    this.clearSettings = opts.clearSettings !== undefined ? opts.clearSettings : true

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

    if (opts.needAuth) {
      props.tokenRequest = async () => {
        return this.getDisposable()
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
        await this.getDisposable()
      }
    }

    return createAxios(props)
  }

  async getDisposable(): Promise<string | null> {
    try {
      const alias = this.source === 'hub' ? 'devio-hub' : this.alias
      const lsAlias = `${alias}-disposableToken`
      const productId = this.source === 'hub' ? this.productId : null

      let jwtExpired = false
      let jwtNotExists = true

      // если есть в localStorage но нет у нас
      if (localStorage[lsAlias] && !this.disposableToken) {
        this.disposableToken = localStorage[lsAlias] + (productId ? `:${productId}` : '')
        this.disposableDecoded = decode(localStorage[lsAlias])
      }

      if (this.disposableDecoded) {
        jwtNotExists = !(+this.window.AMOCRM.constant('user').id === this.disposableDecoded.user_id)

        const expiresDiff = moment.unix(+this.disposableDecoded.exp).diff(moment(), 'seconds')

        // если токен заканчивается меньше чем через 2 минуты
        jwtExpired = expiresDiff <= (+localStorage.devioJWTexpireBuffer || 120)
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

          localStorage[lsAlias] = token
          this.disposableToken = token + (productId ? `:${productId}` : '')
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
      console.error(`[${this.productId}] Ошибка при выполнении ${action}: ${e.message}`)
    }

    const init = async () => {
      return new Promise((resolve) => {
        if (!this.initFired) {
          this.initFired = true

          that.init().then(() => resolve(true))
        } else {
          resolve(true)
        }
      })
    }

    return {
      init: () => true,
      render: function () {
        try {
          const isAdvanced =
            window.location.pathname.indexOf(
              '/settings/widgets/' + that.amoWidget?.params.widget_code + '/'
            ) === 0

          if (isAdvanced) {
            if (!that.window.AMOCRM.first_load) {
              init()
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
            init()
              .then(() => {
                try {
                  that.render().catch((e) => errLog('render', e))
                } catch (e) {
                  errLog('render', e)
                }
              })
              .catch((e) => errLog('init', e))
          }
        } catch (e) {}

        return true
      },
      advancedSettings: function () {
        try {
          if (that.window.AMOCRM.first_load) {
            init()
              .then(() => {
                try {
                  that.render().catch((e) => errLog('render', e))
                } catch (e) {
                  errLog('render', e)
                }
              })
              .catch((e) => errLog('init', e))
          }
        } catch (e) {}

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
      dpSettings: function () {
        try {
          that.dpSettings()
        } catch (e) {
          errLog('dpSettings', e)
        }

        return true
      },
      settings(modal: any) {
        try {
          if (that.clearSettings) {
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
          }
        } catch (e) {
          console.error(e)
        }

        try {
          init().then(() => {
            that.settings(modal)
          })
        } catch (e) {
          errLog('settings', e)
        }

        return true
      },
      initMenuPage() {
        try {
          const isOurWidgetPage =
            window.location.pathname.indexOf(
              `widget_page/${that.amoWidget?.params.widget_code}/main/list`
            ) === 1

          if (isOurWidgetPage) {
            try {
              that.initMenuPage()
            } catch (e) {
              errLog('initMenuPage', e)
            }
          }
        } catch (e) {}

        return true
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

  can(alias: string, def = false) {
    if (this._auth === undefined) throw new Error('Авторизация не загружена, вызовите fetchAuth')
    if (this._access === undefined)
      throw new Error('Настройки доступа не загружены, вызовите fetchAccess')

    const userId = this._auth.accountUser.amoId
    const groupId = this._auth.accountUserGroup.amoId

    const allowGroup =
      this._access[`group_${groupId}_${alias}`] !== undefined
        ? this._access[`group_${groupId}_${alias}`]
        : undefined
    const allowUser =
      this._access[`user_${userId}_${alias}`] !== undefined
        ? this._access[`user_${userId}_${alias}`]
        : undefined

    return allowGroup || allowUser || def
  }

  private _config: any = undefined
  get config() {
    return this._config
  }
  async fetchConfig(force = false) {
    if (!force && this._config !== undefined) return this._config

    const { data } = await this.api.get('/hub/settings')
    this._config = data

    return data
  }
  async saveConfig(config: any) {
    this._config = config

    await this.api.post('/hub/settings', config)
  }

  private _access: any = undefined
  get access() {
    return this._access
  }
  async fetchAccess(force = false) {
    if (!force && this._access !== undefined) return this._access

    const { data } = await this.api.get('/hub/access')
    this._access = data

    return data
  }
  async saveAccess(access: any) {
    this._access = access

    await this.api.post('/hub/access', access)
  }

  private _auth: any = undefined
  get auth() {
    return this._auth
  }
  async fetchAuth(force = false) {
    if (!force && this._auth !== undefined) return this._auth

    const { data } = await this.api.get('/oauth/me')
    this._auth = data

    return data
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

  async dpSettings(): Promise<any> {
    console.log('Method "dpSettings" not implemented')
  }

  async linkCard(): Promise<boolean> {
    console.log('Method "linkCard" not implemented')
    return true
  }
}
