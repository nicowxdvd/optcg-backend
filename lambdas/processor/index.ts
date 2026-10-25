import { DynamoDBClient, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { S3Event, SQSEvent } from 'aws-lambda';

const dynamo  = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JOB_KEY = /^incoming\/([^/]+)\//;

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
            if (jobId)
                await markProcessing(jobId);
        }
    }
};