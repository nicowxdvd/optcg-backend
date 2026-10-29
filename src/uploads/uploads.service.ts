import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { DYNAMO_CLIENT, S3_PRESIGN_CLIENT } from "../aws/aws.constants";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { ConfigService } from "@nestjs/config";
import { randomUUID } from "crypto";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { CreateUploadDto } from "./dto/CreateUploadDto";


interface JobItem { jobId: string; status: string; error?: string }
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

const URL_EXPIRES_IN = 300;
const PENDING_TTL    = 3600;

@Injectable()
export class UploadsService {

    constructor(
        @Inject(S3_PRESIGN_CLIENT) private readonly s3Presign : S3Client,
        @Inject(DYNAMO_CLIENT) private readonly dynamo        : DynamoDBDocumentClient,
        private readonly config: ConfigService)
    {}



    async create(dto: CreateUploadDto): Promise<{ jobId: string; uploadUrl: string; expiresIn: number }> {
        const jobId  = randomUUID();
        const key    = `incoming/${jobId}/original.${EXTENSIONS[dto.contentType]}`;
        const bucket = this.config.getOrThrow<string>('S3_UPLOADS_BUCKET');
        const now    = Date.now();

        const uploadUrl = await getSignedUrl(
            this.s3Presign,
            new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: dto.contentType, ContentLength: dto.size }),
            { expiresIn: URL_EXPIRES_IN, signableHeaders: new Set(['content-type']) }
        );

        await this.dynamo.send(
            new PutCommand({ 
                TableName: 'jobs', 
                Item: {
                    pk        : `JOB#${jobId}`, sk: 'META', jobId, status: 'PENDING', key,
                    createdAt : new Date(now).toISOString(),
                    ttl       : Math.floor(now / 1000) + PENDING_TTL
                }
            })
        );

        return { jobId, uploadUrl, expiresIn: URL_EXPIRES_IN };
    }



    async get(jobId: string): Promise<{ jobId: string; status: string; error?: string }> {
        const { Item } = await this.dynamo.send(new GetCommand({ TableName: 'jobs', Key: { pk: `JOB#${jobId}`, sk: 'META' } }));
        if (!Item)
            throw new NotFoundException('Upload not found');

        const job = Item as JobItem;
        return { jobId: job.jobId, status: job.status, ...(job.error && { error: job.error }) };
    }
    
}