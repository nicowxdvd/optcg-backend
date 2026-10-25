import { Inject, Injectable } from "@nestjs/common";
import { DYNAMO_CLIENT, S3_CLIENT } from "../aws/aws.constants";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DeleteCommand, DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";

const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };


@Injectable()
export class UploadsService {

    constructor(
        @Inject(S3_CLIENT)     private readonly s3    : S3Client,
        @Inject(DYNAMO_CLIENT) private readonly dynamo: DynamoDBDocumentClient,
        private readonly config: ConfigService)
    {}



    async create(file: Express.Multer.File): Promise<{ jobId: string; status: string }> {
        const jobId  = randomUUID();
        const key    = `incoming/${jobId}/original.${EXTENSIONS[file.mimetype]}`;
        const bucket = this.config.getOrThrow<string>('S3_UPLOADS_BUCKET');
        const item   = { pk: `JOB#${jobId}`, sk: 'META' };

        await this.dynamo.send(new PutCommand({ TableName: 'jobs', Item: { ...item, jobId, status: 'UPLOADED', key, createdAt: new Date().toISOString() } }));

        try {
            await this.s3.send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: file.buffer, ContentType: file.mimetype }));
        } catch (error) {
            await this.dynamo.send(new DeleteCommand({ TableName: 'jobs', Key: item }));
            throw error;
        }

        return { jobId, status: 'UPLOADED' };
    }
    
}