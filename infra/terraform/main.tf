terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  shared_credentials_files = ["~/.aws/credentials"]
}

# ---------------------------------------------------------------------------
# Test bucket for the Cloud Log Access Service
# ---------------------------------------------------------------------------
resource "aws_s3_bucket" "logs" {
  bucket        = var.bucket_name
  force_destroy = var.force_destroy

  tags = {
    Project     = "cloud-log-access-service"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

resource "aws_s3_bucket_versioning" "logs" {
  bucket = aws_s3_bucket.logs.id

  versioning_configuration {
    status = "Enabled"
  }
}

# Object storage holding logs must never be public — access flows through the BFF.
resource "aws_s3_bucket_public_access_block" "logs" {
  bucket = aws_s3_bucket.logs.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "logs" {
  bucket = aws_s3_bucket.logs.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# ---------------------------------------------------------------------------
# Least-privilege read-only credentials for the backend (local testing)
# ---------------------------------------------------------------------------
resource "aws_iam_user" "log_reader" {
  count = var.create_reader_user ? 1 : 0
  name  = "${var.bucket_name}-reader"
}

resource "aws_iam_user_policy" "log_reader" {
  count = var.create_reader_user ? 1 : 0
  name  = "read-logs"
  user  = aws_iam_user.log_reader[0].name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ListBucket"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.logs.arn
      },
      {
        Sid      = "ReadObjects"
        Effect   = "Allow"
        Action   = ["s3:GetObject"]
        Resource = "${aws_s3_bucket.logs.arn}/*"
      },
    ]
  })
}

resource "aws_iam_access_key" "log_reader" {
  count = var.create_reader_user ? 1 : 0
  user  = aws_iam_user.log_reader[0].name
}