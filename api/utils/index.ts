interface RequestParams {
  [key: string]: string
}

export async function request (
  wsUrl: string,
  path: string,
  data: RequestParams
) {
  let url = wsUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:') + path
  let response = await fetch(url, {
    method: 'POST',
    body: JSON.stringify(data)
  })
  if (response.status < 200 || response.status > 299) {
    throw new Error(`Response code ${response.status}`)
  }
}
