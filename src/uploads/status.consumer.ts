import { Inject, Injectable, Logger, OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeleteMessageCommand, Message, ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { SQS_CLIENT } from '../aws/aws.constants';

interface JobStatusEvent { jobId: string; status: string; at: string; error?: string }

@Injectable()
export class StatusConsumer implements OnApplicationBootstrap, OnApplicationShutdown {
    private readonly logger = new Logger(StatusConsumer.name);
    private running         = false;



    constructor(
        @Inject(SQS_CLIENT) private readonly sqs: SQSClient,
        private readonly config: ConfigService)
    {}



    onApplicationBootstrap(): void {
        this.running = true;
        void this.poll();
    }



    onApplicationShutdown(): void {
        this.running = false;
    }



    private async poll(): Promise<void> {
        const queueUrl = this.config.getOrThrow<string>('STATUS_QUEUE_URL');

        while (this.running) {
            try {
                const { Messages = [] } = await this.sqs.send(new ReceiveMessageCommand({
                    QueueUrl: queueUrl, MaxNumberOfMessages: 10, WaitTimeSeconds: 20
                }));

                for (const message of Messages)
                    await this.handle(queueUrl, message);
            } catch (err) {
                this.logger.error(err);
                await new Promise(resolve => setTimeout(resolve, 5000));
            }
        }
    }



    private async handle(queueUrl: string, message: Message): Promise<void> {
        const event = JSON.parse(message.Body!) as JobStatusEvent;
        this.logger.log(`job ${event.jobId} -> ${event.status}${event.error ? ` (${event.error})` : ''}`);

        await this.sqs.send(new DeleteMessageCommand({ QueueUrl: queueUrl, ReceiptHandle: message.ReceiptHandle! }));
    }
}