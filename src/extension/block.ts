import { BlockRequest } from '../common/types'

export async function blockResponse(request: BlockRequest) {
  // console.log(request.body)
  // logStreamOptions(request)
  const { body, options, onStart, onError, onComplete } = request
  const controller = new AbortController()
  console.log(body)
  console.log(options)

  try{
    const url = `${options.protocol}://${options.hostname}:${options.port}${options.path}`

    const fetchOptions = {
      method: options.method,
      headers: options.headers,
      body: JSON.stringify(body),
      signal: controller.signal
    }

    onStart?.(controller)
    const response = await fetch(url, fetchOptions)

    if(!response.ok) throw new Error(`Server responded with status code: ${response.status}`)
    if(!response.body) throw new Error('Failed to get a ReadableStream from the response')

      const jsonResponse = await response.json()

      // 如果 jsonResponse 类型未知，可以在调用 onComplete 前进行检查
      if (typeof jsonResponse === 'object' && jsonResponse !== null) {
        onComplete?.(jsonResponse) // 调用 onComplete 并传入解析后的 JSON 数据
      } else {
        console.error('Unexpected JSON structure:', jsonResponse)
      }
  }catch(error: unknown){
    controller.abort()
    if(error instanceof Error){
      if(error.name === 'AbortError'){
        onComplete?.(null)
      }else{
        console.error('Fetch error:', error)
        onError?.(error)
      }
    }
    console.log('error happened')
  }
}
