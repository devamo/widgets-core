import { v4 } from 'uuid'
import { SuperAxios } from '../axios'

export type PatchedWebsocket = WebSocket & {
  id?: string
}

export type WebSocketsOptions = {
  axios: SuperAxios

  wsUrl: string
  actions: any
  needAuth: boolean
  autoConnect: boolean

  tokenRequest?: () => Promise<string | null>
}

export class WebSockets {
  public axios: SuperAxios

  private _id = ''
  private ws: PatchedWebsocket | null = null
  private needAuth: boolean
  private authUrl: string
  private actions: any = {}
  private tokenRequest: null | (() => any)

  constructor(opts: WebSocketsOptions) {
    this.authUrl = opts.wsUrl || 'wss://wss.amodev.ru'
    this.actions = opts.actions || {}
    this.needAuth = opts.needAuth || false
    this.axios = opts.axios
    this.tokenRequest = opts.tokenRequest || null
  }

  private _token: string | undefined = undefined
  private _tokenChecker: any = null

  private async getToken() {
    if (this.tokenRequest) {
      return await this.tokenRequest()
    }

    return null
  }

  private _checkingActive = false
  private async awaitWsClosed() {
    if (!this.ws || this.ws.CLOSED) {
      return
    }

    await new Promise(resolve => setTimeout(resolve, 100))
    return this.awaitWsClosed()
  }

  async checkToken() {
    if (this._checkingActive) return

    this._checkingActive = true
    // console.log(`check token`)

    try {
      if (this._tokenChecker) {
        clearTimeout(this._tokenChecker)
        this._tokenChecker = null
      }

      // если актуальный токен не равен сохранненому - реконнектим сокеты
      if (this.tokenRequest && this._token !== (await this.getToken())) {
        console.log(`checking error - token invalid, closing sockets`)

        this.ws?.close(3999)
        await this.awaitWsClosed()

        this._checkingActive = false
        await this.connect()

        return
      } else {
        // console.log(`set timeout check, 1s`)
        this._tokenChecker = setTimeout(() => this.checkToken(), 1000)
      }
    } catch (e) {
      console.log(`check token error: ${e.message}`)
    }

    this._checkingActive = false
  }

  async connect(force = false) {
    if (this.ws && !force) return

    this._token = await this.getToken()

    const promise = new Promise((resolve, reject) => {
      const id = v4()
      const token = this._token ? `?key=${this._token}&token=Disposable` : ''
      this.ws = new WebSocket(this.authUrl + token)
      this.ws.id = id

      this.ws?.addEventListener('error', e => {
        if (this._tokenChecker) {
          clearTimeout(this._tokenChecker)
          this._tokenChecker = null
        }

        reject(e)
      })

      this.ws?.addEventListener('open', () => resolve(true))
      this.ws?.addEventListener('close', event => {
        if (this._tokenChecker) {
          clearTimeout(this._tokenChecker)
          this._tokenChecker = null
        }

        if (event.code === 3999) {
          console.log(`Connection ${this.ws?.id} closed [${event.code}] manually, reconnecting not needed `)
        } else {
          if (this.ws?.id === id || !this.ws?.id) {
            console.log(`Connection ${this.ws?.id} closed [${event.code}], retrying in 5s...`)

            setTimeout(() => this.connect(true), 5000)
          } else {
            console.log(`Connection ${this.ws?.id} closed, sockets recreated, reconnecting not needed`)
          }
        }

        this.ws = null
      })

      this.ws?.addEventListener('message', msg => {
        // console.log(`msg`, msg.data)

        if (msg.data === 'ping') {
          this.ws?.send('pong')
        }

        if (['ping', 'pong'].includes(msg.data)) {
          return
        }

        try {
          const { action, data } = JSON.parse(msg.data)

          if (action && this.actions[action]) {
            try {
              this.actions[action](data, this.ws)
            } catch (e) {
              console.error(`Ошибка при вызове метода сокетов ${action}: ${e.message || e || 'неизвестная ошибка'}`)
            }
          }
        } catch (e) {
          console.error('Ошибка при обработке сокетов')
        }
      })
    })

    return new Promise((resolve, reject) => {
      promise
        .then(() => {
          console.log('sockets connected, init checker')

          // if (!this._dump) {
          //   this._dump = true
          //   setTimeout(() => {
          //     console.log('invalidate token')
          //     this._token = undefined
          //   }, 5000)
          // }

          this.checkToken()
          resolve(true)
        })
        .catch(e => reject(e))
    })
  }
  private _dump = false
}
