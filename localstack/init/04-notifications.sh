#!/bin/bash
QUEUE_URL=$(awslocal sqs get-queue-url --queue-name process-queue --query QueueUrl --output text)
QUEUE_ARN=$(awslocal sqs get-queue-attributes --queue-url "$QUEUE_URL" --attribute-names QueueArn --query 'Attributes.QueueArn' --output text)

awslocal sqs set-queue-attributes \
  --queue-url "$QUEUE_URL" \
  --attributes '{"Policy":"{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":{\"Service\":\"s3.amazonaws.com\"},\"Action\":\"sqs:SendMessage\",\"Resource\":\"'"$QUEUE_ARN"'\",\"Condition\":{\"ArnLike\":{\"aws:SourceArn\":\"arn:aws:s3:::uploads-tmp\"}}}]}"}'

awslocal s3api put-bucket-notification-configuration \
  --bucket uploads-tmp \
  --notification-configuration '{"QueueConfigurations":[{"QueueArn":"'"$QUEUE_ARN"'","Events":["s3:ObjectCreated:*"],"Filter":{"Key":{"FilterRules":[{"Name":"prefix","Value":"incoming/"}]}}}]}'