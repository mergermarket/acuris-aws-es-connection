# AWS ES Connection

> AWS ES connection for the new elasticsearch client (@elastic/elasticsearch)

## Usage
 Javascript:
```
const { Client } = require('@elastic/elasticsearch');
const { createAWSConnection, awsCredsifyAll, awsGetCredentials } = require('@acuris/aws-es-connection')

const awsCredentials = await awsGetCredentials()
const AWSConnection = createAWSConnection(awsCredentials)
const client = awsCredsifyAll(
  new Client({
    node: 'https://node-name.eu-west-1.es.amazonaws.com',
    Connection: AWSConnection
  })
)

// inside async func
await client.cat.help()
```

 Typescript:
```
import { createAWSConnection, awsCredsifyAll, awsGetCredentials } from '@acuris/aws-es-connection'
import AWS from 'aws-sdk'
import { Client } from '@elastic/elasticsearch'

const awsCredentials = await awsGetCredentials()
const AWSConnection = createAWSConnection(awsCredentials)
const client = awsCredsifyAll(
  new Client({
    node: 'https://node-name.eu-west-1.es.amazonaws.com',
    Connection: AWSConnection
  })
)

// inside async func
await client.cat.help()
```

## How does it work?
This package has two parts. Firstly the createAWSConnection returns a class which signs the calls to AWS elasticsearch. The second part - awsCredsifyAll wraps the elastic search client so that all calls first check that the AWS credentials haven't expired and refreshes them when needed.

## Developer notes
### Running the tests.
Make sure that your AWS credentials are available to your env, for example you could set them in your ENV.

You need a running AWS ES instance for the tests to run against. Set the endpoint URL as the env `AWS_ES_ENDPOINT`.

```
AWS_ES_ENDPOINT=https://xxxx.es.amazonaws.com yarn test
```
