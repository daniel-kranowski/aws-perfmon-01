#@IgnoreInspection BashAddShebang
# Intended to be sourced by various sh files

# You should customize this template as follows, before running terraform
# in this project:
#
# - Set PROJECT_NAME to any string, it will be used as a naming prefix
#   in most of our terraform resources.
#
# - Change AWS_S3_BUCKET to the name of a real bucket that your profile has
#   permission to write.  We'll put a tfstate file there.
#
# - Change AWS_S3_KEY to the desired "absolute path" inside the s3 bucket,
#   where we will store the tfstate file.
#
# - Set AWS_PROFILE to another real profile in ~/.aws/credentials,
#   if you aren't satisfied with the default profile.  Terraform will use
#   these credentials to connect and manage infrastructure.
#
# - Set AWS_REGION to the region where your profile credentials exist,
#   and where you will spinup all the resources.  TF_VAR_az[123] should
#   be distinct availability zones in the region.
#
# - Set TF_VAR_globalTags to whatever tags you want to see on all resources.
#   Or set to '{}' if you are uninterested in having global tags.
#
# - Set TF_VAR_rdsMasterPassword to something else to be a bit safer while the
#   experiment is running.
#
# - Finally, rename this file to setTerraformEnvars.bash, because the other scripts
#   are expecting to see that.
#

# Used only in this script, change as desired.
PROJECT_NAME=aws-perfmon-01

# Variables needed by runTerraformXXX.sh scripts, change these as desired.
AWS_S3_BUCKET=name-of-s3-bucket-where-we-will-store-the-tfstate-file
AWS_S3_KEY=hello/world/$PROJECT_NAME.tfstate
TFPLAN_FILE=$PROJECT_NAME.tfplan

# Variables needed by the Terraform sub-shell, change these as desired.
export AWS_PROFILE=default
export AWS_REGION=us-west-2
export TF_VAR_az1=us-west-2a
export TF_VAR_az2=us-west-2b
export TF_VAR_az3=us-west-2c
export TF_VAR_globalTags='{ Department = "Engineering", AnotherTag = "I like these optional AWS tags" }'
export TF_VAR_rdsMasterPassword=CHANGE-ME

# Don't change these.
export TF_VAR_project=$PROJECT_NAME
export TF_VAR_region=$AWS_REGION

# Used by the other scripts, do not change.
run_cmd() {
  echo "RUNNING: $@"
  "$@"
}
