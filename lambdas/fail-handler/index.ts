import { DynamoDBClient, ConditionalCheckFailedException } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import type { S3Event, SQSEvent } from 'aws-lambda';

const dynamo  = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const JOB_KEY = /^incoming\/([^/]+)\//;



const markFailed = async (jobId: string): Promise<void> => {
    try {
        await dynamo.send(new UpdateCommand({
            TableName                 : 'jobs',
            Key                       : { pk: `JOB#${jobId}`, sk: 'META' },
            UpdateExpression          : 'SET #status = :failed, #error = :error REMOVE #ttl',
            ConditionExpression       : '#status IN (:pending, :processing)',
            ExpressionAttributeNames  : { '#status': 'status', '#error': 'error', '#ttl': 'ttl' },
            ExpressionAttributeValues : {
                ':failed'     : 'FAILED',
                ':error'      : 'MAX_RETRIES_EXCEEDED',
                ':pending'    : 'PENDING',
                ':processing' : 'PROCESSING'
            }
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
            if (!jobId)
                continue;

            await markFailed(jobId);
        }
    }
};