output "bucket_name" {
  description = "Name of the provisioned bucket (use as AWS_BUCKET)"
  value       = aws_s3_bucket.logs.bucket
}

output "bucket_arn" {
  description = "ARN of the provisioned bucket"
  value       = aws_s3_bucket.logs.arn
}

output "reader_access_key_id" {
  description = "Access key ID for the read-only IAM user (if created)"
  value       = var.create_reader_user ? aws_iam_access_key.log_reader[0].id : null
  sensitive   = true
}

output "reader_secret_access_key" {
  description = "Secret access key for the read-only IAM user (if created)"
  value       = var.create_reader_user ? aws_iam_access_key.log_reader[0].secret : null
  sensitive   = true
}