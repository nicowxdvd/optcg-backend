#!/bin/bash
awslocal s3 mb s3://uploads-tmp
awslocal s3 mb s3://optimized
awslocal s3api put-bucket-lifecycle-configuration \
  --bucket uploads-tmp \
  --lifecycle-configuration '{"Rules":[{"ID":"expire-incoming","Status":"Enabled","Filter":{"Prefix":"incoming/"},"Expiration":{"Days":1}}]}'
awslocal s3api put-bucket-cors \
  --bucket uploads-tmp \
  --cors-configuration '{"CORSRules":[{"AllowedOrigins":["http://localhost:5173"],"AllowedMethods":["PUT"],"AllowedHeaders":["*"],"ExposeHeaders":["ETag"],"MaxAgeSeconds":3000}]}'
