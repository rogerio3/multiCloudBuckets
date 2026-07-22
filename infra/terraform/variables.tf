variable "aws_region" {
  description = "AWS region for the bucket"
  type        = string
  default     = "us-east-1"
}

variable "bucket_name" {
  description = "Globally-unique name of the S3 test bucket"
  type        = string
}

variable "environment" {
  description = "Deployment environment tag"
  type        = string
  default     = "dev"
}

variable "force_destroy" {
  description = "Allow destroying the bucket even when it contains objects (handy for throwaway test buckets)"
  type        = bool
  default     = false
}

variable "create_reader_user" {
  description = "Create a least-privilege IAM user whose credentials the backend can use for local testing"
  type        = bool
  default     = true
}