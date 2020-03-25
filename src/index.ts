import * as AWS from 'aws-sdk'
import { request, ClientRequest, ClientRequestArgs } from 'http'
import { sign } from 'aws4'
import { Client, Connection } from '@elastic/elasticsearch'

import whitelistedProps from './whitelisted-props'

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

export function createAWSConnection(awsCredentials: AWS.Credentials) {
  AWSConnection.prototype.awsCredentials = awsCredentials
  return AWSConnection
}

export const awsCredsify = (originalFunc: Function) => {
  return (params, options, callback) => {
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
      return (AWS.config.credentials as AWS.Credentials)
        .getPromise()
        .then(() => originalFunc.call(this, params, options, callback))
    }

    //Wrap callback API
    ;(AWS.config.credentials as AWS.Credentials).get(err => {
      if (err) {
        callback(err, null)
        return
      }

      originalFunc(params, options, callback)
    })
  }
}

export const awsCredsifyAll = (object: Client, isNested: boolean = false): Client => {
  for (const key of Object.getOwnPropertyNames(object)) {
    if (!isNested && !whitelistedProps.includes(key)) {
      continue
    }

    // Go 1 level deep and wrap the nested functions
    if (!isNested && typeof object[key] === 'object') {
      object[key] = awsCredsifyAll(object[key], true)
      continue
    }

    // Wrap all the functions that exist on the object and not its parents
    const descriptor = Object.getOwnPropertyDescriptor(object, key)
    if (!descriptor.get) {
      const func = object[key]
      if (typeof func === 'function') {
        object[key] = awsCredsify(func)
      }
    }
  }

  return object
}

export const awsGetCredentials = (): Promise<AWS.Credentials> => {
  return new Promise((resolve, reject) => {
    AWS.config.getCredentials(err => {
      if (err) {
        return reject(err)
      }

      resolve(AWS.config.credentials as AWS.Credentials)
    })
  })
}
