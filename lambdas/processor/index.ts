import { DynamoDBClient, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { S3Event, SQSEvent } from 'aws-lambda';
import { S3Client, CopyObjectCommand } from '@aws-sdk/client-s3';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';

const sns = new SNSClient({});
const s3      = new S3Client({ forcePathStyle: true });
const dynamo  = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JOB_KEY = /^incoming\/([^/]+)\//;



const publish = async (jobId: string, status: string): Promise<void> => {
    await sns.send(new PublishCommand({
        TopicArn : process.env.SNS_TOPIC_ARN,
        Message  : JSON.stringify({ jobId, status, at: new Date().toISOString() })
    }));
};



const markProcessing = async (jobId: string): Promise<void> => {
    try {
        await dynamo.send(new UpdateCommand({
            TableName                 : 'jobs',
            Key                       : { pk: `JOB#${jobId}`, sk: 'META' },
            UpdateExpression          : 'SET #status = :processing REMOVE #ttl',
            ConditionExpression       : '#status = :pending',
            ExpressionAttributeNames  : { '#status': 'status', '#ttl': 'ttl' },
            ExpressionAttributeValues : { ':processing': 'PROCESSING', ':pending': 'PENDING' }
        }));

        await publish(jobId, 'PROCESSING');
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException) 
            return;
        throw err;
    }
};



const optimize = async (jobId: string, key: string): Promise<void> => {
    await s3.send(new CopyObjectCommand({
        Bucket     : 'optimized',
        Key        : `optimized/${jobId}.webp`,
        CopySource : `uploads-tmp/${key}`
    }));
};



const markCompleted = async (jobId: string): Promise<void> => {
    try {
        await dynamo.send(new UpdateCommand({
            TableName                 : 'jobs',
            Key                       : { pk: `JOB#${jobId}`, sk: 'META' },
            UpdateExpression          : 'SET #status = :completed',
            ConditionExpression       : '#status = :processing',
            ExpressionAttributeNames  : { '#status': 'status' },
            ExpressionAttributeValues : { ':completed': 'COMPLETED', ':processing': 'PROCESSING' }
        }));

        await publish(jobId, 'COMPLETED');
    } catch (err) {
        if (err instanceof ConditionalCheckFailedException)
            return;
        throw err;
    }
};



export const handler = async (event: SQSEvent): Promise<void> => {
    for (const record of event.Records) {
        const body = JSON.parse(record.body) as S3Event;
        if (!body.Records) 
            continue;

        for (const s3 of body.Records) {
            const key   = decodeURIComponent(s3.s3.object.key.replace(/\+/g, ' '));
            const jobId = JOB_KEY.exec(key)?.[1];
            if (!jobId)
                continue;

            await markProcessing(jobId);
            await optimize(jobId, key);
            await markCompleted(jobId);
        }
    }
};


