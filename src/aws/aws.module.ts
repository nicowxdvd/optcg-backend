import { S3Client } from '@aws-sdk/client-s3';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { SQSClient } from '@aws-sdk/client-sqs';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DYNAMO_CLIENT, S3_CLIENT, S3_PRESIGN_CLIENT, SQS_CLIENT } from './aws.constants';

const awsOptions = (config: ConfigService) => ({
  endpoint    : config.get<string>('AWS_ENDPOINT_URL'),
  region      : config.get<string>('AWS_REGION', 'us-east-1'),
  credentials : { accessKeyId: config.getOrThrow<string>('AWS_ACCESS_KEY_ID'), secretAccessKey: config.getOrThrow<string>('AWS_SECRET_ACCESS_KEY') },
});

@Global()
@Module({
  providers: [
    { provide: S3_CLIENT,     inject: [ConfigService], useFactory: (config: ConfigService) => new S3Client({ ...awsOptions(config), forcePathStyle: true, requestChecksumCalculation: 'WHEN_REQUIRED' }) },
    { provide: DYNAMO_CLIENT, inject: [ConfigService], useFactory: (config: ConfigService) => DynamoDBDocumentClient.from(new DynamoDBClient(awsOptions(config))) },
    { provide: S3_PRESIGN_CLIENT, inject: [ConfigService], useFactory: (config: ConfigService) => new S3Client({ ...awsOptions(config), endpoint: config.get<string>('S3_PUBLIC_ENDPOINT') ?? config.get<string>('AWS_ENDPOINT_URL'), forcePathStyle: true, requestChecksumCalculation: 'WHEN_REQUIRED' }) },
    { provide: SQS_CLIENT, inject: [ConfigService], useFactory: (config: ConfigService) => new SQSClient(awsOptions(config)) },
  ],
  exports: [S3_CLIENT, S3_PRESIGN_CLIENT, DYNAMO_CLIENT, SQS_CLIENT],
})
export class AwsModule {}