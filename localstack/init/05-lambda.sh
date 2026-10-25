#!/bin/bash
cd /lambdas/processor && zip -q /tmp/processor.zip index.js

awslocal lambda create-function \
  --function-name processor \
  --runtime nodejs22.x \
  --handler index.handler \
  --role arn:aws:iam::000000000000:role/lambda-role \
  --timeout 30 \
  --zip-file fileb:///tmp/processor.zip \
  --environment 'Variables={AWS_ENDPOINT_URL=http://localhost.localstack.cloud:4566}'

QUEUE_ARN=$(awslocal sqs get-queue-attributes \
  --queue-url http://sqs.us-east-1.localhost.localstack.cloud:4566/000000000000/process-queue \
  --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

awslocal lambda create-event-source-mapping \
  --function-name processor \
  --event-source-arn "$QUEUE_ARN" \
  --batch-size 1