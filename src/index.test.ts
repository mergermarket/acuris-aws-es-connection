import { createAWSConnection, awsGetCredentials } from './index'
import * as AWS from 'aws-sdk'
import { Client } from '@elastic/elasticsearch'

describe('aws-es-connection', () => {
  let esClient: Client
  let indexPrefix: string

  beforeAll(async () => {
    const esEndpoint = process.env.AWS_ES_ENDPOINT
    if (!esEndpoint) {
      throw new Error(
        'AWS_ES_ENDPOINT ENV not set. Make sure the env is set to a real AWS ES endpoint and that you have AWS credentials set.'
      )
    }

    // Try make an API call to check credentials are good
    try {
      await new AWS.ES({ region: 'eu-west-1' }).listElasticsearchVersions().promise()
    } catch (err) {
      throw new Error('Failed to make an call to the AWS API. Check your AWS credentials are set and valid.')
    }

    const awsEsConnection = createAWSConnection(await awsGetCredentials())
    esClient = new Client({
      ...awsEsConnection,
      node: esEndpoint
    })

    indexPrefix = `aws-es-connection-tests-${new Date().getTime()}`
  })

  test('aws creds are retrieved before each async call', async () => {
    const spy = jest.spyOn(AWS.config.credentials as AWS.Credentials, 'getPromise')

    await esClient.cat.health()
    expect(spy).toHaveBeenCalled()
  })

  test('aws creds are retrieved before each callback call', done => {
    const spy = jest.spyOn(AWS.config.credentials as AWS.Credentials, 'get')

    esClient.cat.health(() => {
      try {
        expect(spy).toHaveBeenCalled()
        done()
      } catch (err) {
        done(err)
      }
    })
  })

  test('indices async', async () => {
    const indexName = indexPrefix + '-indices-async'
    try {
      // Create and retrieve index
      await esClient.indices.create({ index: indexName })
      const index = await esClient.indices.get({ index: indexName })
      expect(Object.keys(index.body)).toContain(indexName)
    } finally {
      // Delete index
      await esClient.indices.delete({ index: indexName })
    }
  })

  test('indices callback', done => {
    const indexName = indexPrefix + '-indices-callback'

    const cleanUp = callback => {
      esClient.indices.delete({ index: indexName }, callback)
    }

    // Create and retrieve index
    esClient.indices.create({ index: indexName }, err => {
      if (err) {
        cleanUp(() => done(err))
      }
      esClient.indices.get({ index: indexName }, (err, index) => {
        if (err) {
          cleanUp(() => done(err))
        }
        try {
          expect(Object.keys(index.body)).toContain(indexName)
          cleanUp(err => done(err))
        } catch (err) {
          return cleanUp(() => done(err))
        }
      })
    })
  })

  test('indexing and searching', async () => {
    const indexName = indexPrefix + '-searching'
    const doc1 = { name: 'John', body: 'Hello world' }
    const doc2 = { name: 'Joe', body: 'Lorem ipsum' }
    const doc3 = { name: 'Abbie', body: 'Hello, look at this' }

    try {
      // Create index and index some docs
      await esClient.indices.create({ index: indexName })
      await esClient.index({ index: indexName, refresh: 'wait_for', body: doc1 })
      await esClient.index({ index: indexName, refresh: 'wait_for', body: doc2 })
      await esClient.index({ index: indexName, refresh: 'wait_for', body: doc3 })

      const result = await esClient.search({ index: indexName, q: 'Hello' })
      expect(result.body.hits.total.value).toBe(2)
    } finally {
      // Clean up
      await esClient.indices.delete({ index: indexName })
    }
  })
})
