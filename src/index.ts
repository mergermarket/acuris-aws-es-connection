import { config, Credentials } from 'aws-sdk/global'
import { request, ClientRequest, ClientRequestArgs } from 'http'
import { sign } from 'aws4'
import { Connection, Transport } from '@elastic/elasticsearch'

class AWSConnection extends Connection {
  public awsCredentials

  public constructor(opts) {
    super(opts)
    this.makeRequest = this.signedRequest
  }

  private signedRequest(reqParams: ClientRequestArgs): ClientRequest {
    return request(sign(reqParams, this.awsCredentials))
  }
}

class AWSTransport extends Transport {
  // @ts-ignore
  public request(params, options, callback = undefined) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    }
    if (typeof params === 'function' || params == null) {
      callback = params
      params = {}
      options = {}
    }
    // Wrap promise API
    const isPromiseCall = typeof callback !== 'function'
    if (isPromiseCall) {
      return (config.credentials as Credentials).getPromise().then(() => super.request(params, options, callback))
    }

    ;(config.credentials as Credentials).get(err => {
      if (err) {
        callback(err, null)
        return
      }

      return super.request(params, options, callback)
    })
  }
}

export function createAWSConnection(awsCredentials: Credentials) {
  AWSConnection.prototype.awsCredentials = awsCredentials
  return { Connection: AWSConnection, Transport: AWSTransport }
}

export const awsGetCredentials = (): Promise<Credentials> => {
  return new Promise((resolve, reject) => {
    config.getCredentials(err => {
      if (err) {
        return reject(err)
      }

      resolve(config.credentials as Credentials)
    })
  })
}
