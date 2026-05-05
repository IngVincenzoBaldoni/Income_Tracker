terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.region
}

locals {
  app_name    = var.app_name
  environment = var.environment
  name_prefix = "${var.app_name}-${var.environment}"

  common_tags = {
    Project     = var.app_name
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}
