#!/bin/bash

# You should customize this template as follows, before running:
#
# - Set PROJECT_NAME, AWS_PROFILE, AWS_REGION same as in
#   setTerraformEnvars.bash.
#
# - Set AWS_ACCOUNT_ID to the number of your AWS account.
#

# Change as desired.
PROJECT_NAME=aws-perfmon-01
AWS_PROFILE=default
AWS_REGION=us-west-2
AWS_ACCOUNT_ID=1234567890

# Based on the above, do not change.
ECR_REGISTRY_DOMAIN=${AWS_ACCOUNT_ID}.dkr.ecr.us-west-2.amazonaws.com
ECR_REPO_NAME=${PROJECT_NAME}-msg-producer
ECR_REPO_URI=$ECR_REGISTRY_DOMAIN/$ECR_REPO_NAME

# Login, build and push.  ECR login auth tokens are good for 12 hours.
$(aws ecr get-login --region $AWS_REGION --profile $AWS_PROFILE | sed 's/-e none //')
docker build -t $ECR_REPO_URI .
docker push $ECR_REPO_URI
