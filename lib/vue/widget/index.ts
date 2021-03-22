/* eslint-disable @typescript-eslint/no-unused-vars */
import { AxiosRequestConfig } from 'axios'
import { decode } from 'jsonwebtoken'
import { createAxios, SuperAxios } from '../../../lib/axios'
import types from './types'

export type AmoWidget = types.AmoWidget
export type AmoPage = types.AmoPage
export type VueWidgetOptions = types.WidgetClassOptions

export class VueWidget implements types.WidgetClassInstance {
  public alias = ''
  public productId = ''
  public amoWidget: AmoWidget | null

  public proxy: SuperAxios
  public api: SuperAxios

  public window = window as any
  private disposableToken: string | null = null
  private disposableDecoded: any | null = null

  constructor(opts: VueWidgetOptions) {
    this.alias = opts.alias || 'devio'
    this.productId = opts.productId || ''
    this.amoWidget = opts.amoWidget || null

    if (this.amoWidget) {
      Object.assign(this.amoWidget, { callbacks: this.callbacks() })
    }

    opts.source = opts.source || 'public'
    opts.proxyBaseUrl = opts.proxyBaseUrl || 'https://proxy.amodev.ru'
    opts.apiBaseUrl = opts.apiBaseUrl || 'https://api.amodev.ru'

    this.proxy = this.createAxios(opts.proxyBaseUrl)
    this.api = this.createAxios(opts.apiBaseUrl)
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
        try {
          let jwtExpired = false
          let jwtNotExists = true

          // если есть в localStorage но нет у нас
          if (localStorage[`${this.alias}-disposableToken`] && !this.disposableToken) {
            this.disposableToken = localStorage[`${this.alias}-disposableToken`]
            this.disposableDecoded = decode(this.disposableToken as string)
          }

          if (this.disposableDecoded) {
            console.log('Текущий disposable', this.disposableDecoded)

            jwtNotExists = false
            jwtExpired = Date.now() - 1000 * 10 >= +this.disposableDecoded.exp * 1000
          }

          if (jwtNotExists || jwtExpired) {
            console.log(`jwt ${jwtNotExists ? 'not exists' : 'expired'}, refreshing...`)

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

              localStorage[`${this.alias}-disposableToken`] = token
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
      }
    }

    return createAxios(props)
  }

  callbacks(): any {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const that = this

    return {
      init: () => true,
      render: function () {
        const isAdvanced =
          window.location.pathname.indexOf(
            '/settings/widgets/' + that.amoWidget?.params.widget_code + '/'
          ) === 0

        if (isAdvanced) {
          if (!that.window.AMOCRM.first_load) {
            that.init('advanced').then(() => that.render('advanced'))
          }
        } else {
          const page = that.getAmoPage()
          that.init(page).then(() => that.render(page))
        }

        return true
      },
      advancedSettings: function () {
        if (that.window.AMOCRM.first_load) {
          that.init('advanced').then(() => that.render('advanced'))
        }

        return true
      },
      bind_actions: function () {
        that.bindActions()

        return true
      },
      onSave: function () {
        that.onSave()

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
        } catch (e) {}

        that.settings(modal)

        return true
      },
      initMenuPage() {
        const isOurWidgetPage =
          window.location.pathname.indexOf(
            `widget_page/${that.amoWidget?.params.widget_code}/main/list`
          ) === 1
        if (!isOurWidgetPage) return

        that.initMenuPage()

        return true
      },
      loadPreloadedData: async () => [],
      loadElements: async () => [],
      linkCard: async () => true,
      searchDataInCard: async () => []
    }
  }

  private getAmoPage(): AmoPage {
    return ''
  }

  async init(page: AmoPage): Promise<void> {
    console.log('Method "init" not implemented')
  }

  async render(page: AmoPage): Promise<void> {
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
}
