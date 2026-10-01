import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as opensearchserverless from 'aws-cdk-lib/aws-opensearchserverless';
import * as path from 'path';

export class DocuMindStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Amazon S3 Bucket for Raw Documents
    const documentBucket = new s3.Bucket(this, 'DocuMindDocumentBucket', {
      versioned: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT, s3.HttpMethods.POST],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
    });

    // 2. Amazon OpenSearch Serverless (AOSS) Vector Search Collection
    const collectionName = 'documind-vectors';

    // AOSS Encryption Policy (AWS Owned Key)
    const encPolicy = new opensearchserverless.CfnSecurityPolicy(this, 'AOSSEncryptionPolicy', {
      name: `${collectionName}-enc`,
      type: 'encryption',
      policy: JSON.stringify({
        Rules: [
          {
            ResourceType: 'collection',
            Resource: [`collection/${collectionName}`],
          },
        ],
        AWSOwnedKey: true,
      }),
    });

    // AOSS Network Policy (Permits access to collection and dashboards)
    const netPolicy = new opensearchserverless.CfnSecurityPolicy(this, 'AOSSNetworkPolicy', {
      name: `${collectionName}-net`,
      type: 'network',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'collection',
              Resource: [`collection/${collectionName}`],
            },
            {
              ResourceType: 'dashboard',
              Resource: [`collection/${collectionName}`],
            },
          ],
          AllowFromPublic: true,
        },
      ]),
    });

    // Vector Collection
    const vectorCollection = new opensearchserverless.CfnCollection(this, 'AOSSVectorCollection', {
      name: collectionName,
      type: 'VECTORSEARCH',
      description: 'Vector collection for DocuMind RAG text embeddings',
    });
    vectorCollection.addDependency(encPolicy);
    vectorCollection.addDependency(netPolicy);

    // 3. IAM Role for Lambda Functions
    const lambdaRole = new iam.Role(this, 'DocuMindLambdaExecutionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });

    // Grant AWS Bedrock model invoke permission
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['bedrock:InvokeModel'],
        resources: ['*'], // In production, scope to Titan and Claude 3.5 Sonnet ARNs
      })
    );

    // Grant OpenSearch Serverless data plane access
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ['aoss:APIAccessAll'],
        resources: [vectorCollection.attrArn],
      })
    );

    // Grant S3 access
    documentBucket.grantReadWrite(lambdaRole);

    // AOSS Data Access Policy for Lambda Role
    const dataAccessPolicy = new opensearchserverless.CfnAccessPolicy(this, 'AOSSAccessPolicy', {
      name: `${collectionName}-access`,
      type: 'data',
      policy: JSON.stringify([
        {
          Rules: [
            {
              ResourceType: 'collection',
              Resource: [`collection/${collectionName}`],
              Permission: [
                'aoss:CreateCollectionItems',
                'aoss:DeleteCollectionItems',
                'aoss:UpdateCollectionItems',
                'aoss:DescribeCollectionItems',
              ],
            },
            {
              ResourceType: 'index',
              Resource: [`index/${collectionName}/*`],
              Permission: [
                'aoss:CreateIndex',
                'aoss:DeleteIndex',
                'aoss:UpdateIndex',
                'aoss:DescribeIndex',
                'aoss:ReadDocument',
                'aoss:WriteDocument',
              ],
            },
          ],
          Principal: [lambdaRole.roleArn],
        },
      ]),
    });
    dataAccessPolicy.addDependency(vectorCollection);

    // 4. Ingestion Lambda Function
    const ingestLambda = new lambda.Function(this, 'DocuMindIngestFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'ingest_handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda')),
      role: lambdaRole,
      timeout: cdk.Duration.minutes(5),
      memorySize: 1024,
      environment: {
        OPENSEARCH_ENDPOINT: vectorCollection.attrCollectionEndpoint,
        OPENSEARCH_INDEX_NAME: 'documind-vectors',
        BEDROCK_EMBEDDING_MODEL_ID: 'amazon.titan-embed-text-v2:0',
        S3_BUCKET_NAME: documentBucket.bucketName,
      },
    });

    // Trigger Ingest Lambda when a new PDF or document is uploaded to S3
    documentBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(ingestLambda),
      { prefix: 'documents/' }
    );

    // 5. Query Lambda Function
    const queryLambda = new lambda.Function(this, 'DocuMindQueryFunction', {
      runtime: lambda.Runtime.PYTHON_3_11,
      handler: 'query_handler.handler',
      code: lambda.Code.fromAsset(path.join(__dirname, '../../lambda')),
      role: lambdaRole,
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      environment: {
        OPENSEARCH_ENDPOINT: vectorCollection.attrCollectionEndpoint,
        OPENSEARCH_INDEX_NAME: 'documind-vectors',
        BEDROCK_EMBEDDING_MODEL_ID: 'amazon.titan-embed-text-v2:0',
        BEDROCK_LLM_MODEL_ID: 'anthropic.claude-3-5-sonnet-20240620-v1:0',
      },
    });

    // 6. Amazon API Gateway
    const api = new apigateway.RestApi(this, 'DocuMindRestApi', {
      restApiName: 'DocuMind RAG API',
      description: 'API Gateway for DocuMind Serverless RAG Search Engine',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'Authorization', 'X-Amz-Date', 'X-Api-Key'],
      },
    });

    const queryResource = api.root.addResource('query');
    queryResource.addMethod('POST', new apigateway.LambdaIntegration(queryLambda));

    // 7. Stack Outputs
    new cdk.CfnOutput(this, 'ApiGatewayEndpointUrl', {
      value: api.url,
      description: 'URL for the DocuMind API Gateway',
    });

    new cdk.CfnOutput(this, 'DocumentBucketName', {
      value: documentBucket.bucketName,
      description: 'S3 Bucket name for document uploads',
    });

    new cdk.CfnOutput(this, 'OpenSearchEndpoint', {
      value: vectorCollection.attrCollectionEndpoint,
      description: 'Amazon OpenSearch Serverless collection endpoint',
    });
  }
}
