import Axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios'

export type SuperAxios = PatchedAxios

export type PatchedAxios = {
  request<T = any, R = AxiosResponse<T>>(config: AxiosRequestConfig): Promise<R>
  get<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R>
  post<T = any, R = AxiosResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>
  patch<T = any, R = AxiosResponse<T>>(url: string, data?: any, config?: AxiosRequestConfig): Promise<R>
  delete<T = any, R = AxiosResponse<T>>(url: string, config?: AxiosRequestConfig): Promise<R>
}

export const createAxios = (opts: {
  props: string | AxiosRequestConfig
  interceptor?: (config: any) => any
  beforeRequest?: () => Promise<{ token: string; error?: string }>
}): SuperAxios => {
  if (typeof opts.props === 'string') {
    opts.props = {
      baseURL: opts.props
    }
  }

  const api = Axios.create(opts.props)

  // интерцептор
  api.interceptors.request.use((config: any) => {
    if (opts.interceptor) {
      Object.assign(config, opts.interceptor(config) || {})
    }

    return config
  })

  const patchRequest = async <T = any, R = AxiosResponse<T>>(
    axios: AxiosInstance,
    method: 'request' | 'get' | 'patch' | 'post' | 'delete',
    ...args: any[]
  ): Promise<R> => {
    // только если токен-реквест задана
    if (opts.beforeRequest) {
      try {
        await opts.beforeRequest()
      } catch (e) {
        console.log('Ошибка в axios:beforeRequest', e)
      }
    }

    return (axios[method] as any)(...args) as Promise<R>
  }

  return {
    request: <T, R>(...args: any[]) => patchRequest<T, R>(api, 'request', ...args),
    get: <T, R>(...args: any[]) => patchRequest<T, R>(api, 'get', ...args),
    patch: <T, R>(...args: any[]) => patchRequest<T, R>(api, 'patch', ...args),
    post: <T, R>(...args: any[]) => patchRequest<T, R>(api, 'post', ...args),
    delete: <T, R>(...args: any[]) => patchRequest<T, R>(api, 'delete', ...args)
  }
}
