import { config, Credentials } from 'aws-sdk/global'
import { request as httpRequest, ClientRequest, ClientRequestArgs } from 'http'
import { request as httpsRequest } from 'https'
import { sign } from 'aws4'
import { ClientOptions, Connection, Transport } from '@elastic/elasticsearch'
import { ApiResponse, TransportRequestPromise } from '@elastic/elasticsearch/lib/Transport'

declare type SignOpt = {
  service: 'es';
  region?: string;
}

function generateAWSConnectionClass(credentials: Credentials, signOpts?: SignOpt) {
  return class AWSConnection extends Connection {
    public constructor(opts) {
      super(opts)
      this.makeRequest = this.signedRequest
    }

    private signedRequest(reqParams: ClientRequestArgs): ClientRequest {
      const request = reqParams?.protocol === 'https:' ? httpsRequest : httpRequest

      return request(sign({ ...reqParams, service: 'es', ...signOpts }, credentials))
    }
  }
}

function generateAWSTransportClass(credentials: Credentials) {
  return class AWSTransport extends Transport {
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
        return credentials.getPromise().then(() => super.request(params, options, callback)) as TransportRequestPromise<
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ApiResponse<Record<string, any>, Record<string, unknown>>
        >
      }

      // Wrap callback API
      credentials.get(err => {
        if (err) {
          callback(err, null)
          return
        }

        return super.request(params, options, callback)
      })
    }
  };
}

export function createAWSConnection(awsCredentials: Credentials, signOpts?: SignOpt): ClientOptions {
  return {
    Connection: generateAWSConnectionClass(awsCredentials, signOpts),
    Transport: generateAWSTransportClass(awsCredentials)
  }
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
