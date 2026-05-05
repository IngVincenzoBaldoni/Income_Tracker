# Using local state for MVP.
# To migrate to S3 backend later, uncomment and configure:
#
# terraform {
#   backend "s3" {
#     bucket  = "career-tracker-terraform-state"
#     key     = "dev/terraform.tfstate"
#     region  = "eu-west-1"
#     encrypt = true
#   }
# }

# Add terraform.tfstate* to .gitignore — never commit state files.
