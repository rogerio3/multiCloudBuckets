## ADDED Requirements

### Capability: Multi-Cloud Storage Abstraction

---

### Requirement: Storage Provider Interface
WHEN the system needs to interact with object storage,
the system SHALL use a common `StorageProvider` interface that supports list, download, and presigned URL operations.

#### Scenario: Interface Contract
GIVEN a storage provider implementation
WHEN the provider implements the interface
THEN it SHALL expose `listFiles(prefix, maxKeys)`, `downloadFile(key)`, and `generatePresignedUrl(key, expiresIn)` methods

---

### Requirement: Mock Storage Provider (Local Development)
WHEN the application runs in mock/development mode (no cloud credentials),
the system SHALL use a local filesystem-based mock provider that generates realistic sample log data.

#### Scenario: Mock Data Generation
GIVEN the application starts in mock mode
WHEN the mock provider initializes
THEN it SHALL create sample log files with realistic content (timestamps, log levels, messages)
AND the sample files SHALL include various types: app logs, auth logs, system logs, error logs, nginx access logs

#### Scenario: List Mock Files
GIVEN the mock provider is active
WHEN `listFiles` is called with a prefix
THEN it SHALL return files matching that prefix from the local mock directory
AND the response SHALL include file metadata (key, name, size, lastModified, etag)

#### Scenario: Download Mock File
GIVEN the mock provider is active
WHEN `downloadFile` is called with an existing file key
THEN it SHALL return a readable stream of that file's content
AND the response SHALL include metadata (key, size, lastModified, contentType)

#### Scenario: Mock File Not Found
GIVEN the mock provider is active
WHEN `downloadFile` is called with a non-existent key
THEN it SHALL throw an error with statusCode 404 and code "NotFound"

#### Scenario: Generate Mock Presigned URL
GIVEN the mock provider is active
WHEN `generatePresignedUrl` is called with an existing file key
THEN it SHALL return a local API URL pointing to a download endpoint
AND the response SHALL include `expiresAt` with the calculated expiry timestamp

---

### Requirement: AWS S3 Provider
WHEN the provider is configured as "aws" with valid AWS credentials,
the system SHALL use AWS SDK v3 to interact with the specified S3 bucket.

#### Scenario: List S3 Files
GIVEN AWS S3 provider is configured with valid credentials
WHEN `listFiles` is called
THEN it SHALL call S3 `ListObjectsV2Command` with the configured bucket
AND return formatted file metadata

#### Scenario: Download S3 File
GIVEN AWS S3 provider is configured
WHEN `downloadFile` is called with an existing key
THEN it SHALL call S3 `GetObjectCommand`
AND return the file stream with metadata

#### Scenario: S3 Presigned URL
GIVEN AWS S3 provider is configured
WHEN `generatePresignedUrl` is called
THEN it SHALL use `@aws-sdk/s3-request-presigner` to generate a temporary URL
AND return the URL with expiry timestamp

#### Scenario: S3 File Not Found
GIVEN AWS S3 provider is configured
WHEN `downloadFile` is called with a non-existent key
THEN it SHALL throw an error with statusCode 404 and code "NotFound"

---

### Requirement: GCP GCS Provider
WHEN the provider is configured as "gcp" with valid GCP credentials,
the system SHALL use the `@google-cloud/storage` SDK to interact with the specified bucket.

#### Scenario: List GCS Files
GIVEN GCP GCS provider is configured with valid credentials
WHEN `listFiles` is called
THEN it SHALL use `bucket.getFiles()` with the configured bucket
AND return formatted file metadata

#### Scenario: Download GCS File
GIVEN GCP GCS provider is configured
WHEN `downloadFile` is called with an existing key
THEN it SHALL use `file.createReadStream()`
AND return the file stream with metadata

#### Scenario: GCS Signed URL
GIVEN GCP GCS provider is configured
WHEN `generatePresignedUrl` is called
THEN it SHALL use `file.getSignedUrl()` with action "read"
AND return the signed URL with expiry timestamp

---

### Requirement: Azure Blob Storage Provider
WHEN the provider is configured as "azure" with a valid connection string,
the system SHALL use `@azure/storage-blob` SDK to interact with the specified container.

#### Scenario: List Azure Blobs
GIVEN Azure provider is configured with valid connection string
WHEN `listFiles` is called
THEN it SHALL use `containerClient.listBlobsFlat()`
AND return formatted blob metadata

#### Scenario: Download Azure Blob
GIVEN Azure provider is configured
WHEN `downloadFile` is called with an existing blob name
THEN it SHALL use `blobClient.download()`
AND return the file stream with metadata

#### Scenario: Azure SAS URL
GIVEN Azure provider is configured
WHEN `generatePresignedUrl` is called
THEN it SHALL generate a SAS token with read permissions
AND return the SAS URL with expiry timestamp

---

### Requirement: Log File Listing Endpoint
WHEN a GET request is made to `/api/logs`,
the system SHALL list log files from the configured storage provider.

#### Scenario: List All Files (No Prefix)
GIVEN an authenticated user
WHEN the user sends `GET /api/logs`
THEN the system returns HTTP 200
AND the response body contains `{ files: [...], isTruncated: boolean, nextMarker: string | null }`

#### Scenario: List Files with Prefix Filter
GIVEN an authenticated user
WHEN the user sends `GET /api/logs?prefix=2024-01`
THEN the system SHALL filter files matching the prefix "2024-01"
AND return only matching files

#### Scenario: List Files with Max Keys
GIVEN an authenticated user
WHEN the user sends `GET /api/logs?maxKeys=10`
THEN the system SHALL return at most 10 files
AND set `isTruncated` to true if more files exist

---

### Requirement: Log File Download Endpoint
WHEN a GET request is made to `/api/logs/:key/download`,
the system SHALL stream the log file to the client.

#### Scenario: Download Existing File
GIVEN an authenticated user and an existing file key "2024-01-15-app.log"
WHEN the user sends `GET /api/logs/2024-01-15-app.log/download`
THEN the system returns HTTP 200
AND the response has header `Content-Type: text/plain`
AND the response has header `Content-Disposition: attachment; filename="2024-01-15-app.log"`
AND the response body is the file content stream

#### Scenario: Download Non-Existent File
GIVEN an authenticated user and a non-existent file key
WHEN the user sends `GET /api/logs/nonexistent.log/download`
THEN the system returns HTTP 404
AND the response body contains `{ error: "File not found" }`

---

### Requirement: Presigned URL Generation Endpoint (Bonus)
WHEN a POST request is made to `/api/logs/:key/presign`,
the system SHALL generate a temporary access URL for the specified file.

#### Scenario: Generate Presigned URL
GIVEN an authenticated user and an existing file key
WHEN the user sends `POST /api/logs/2024-01-15-app.log/presign` with body `{ expiresIn: 3600 }`
THEN the system returns HTTP 200
AND the response body contains `{ url: string, expiresAt: string, key: string }`

#### Scenario: Presign Non-Existent File
GIVEN an authenticated user and a non-existent file key
WHEN the user sends `POST /api/logs/nonexistent.log/presign`
THEN the system returns HTTP 404
AND the response body contains `{ error: "File not found" }`

#### Scenario: Presign with Custom Expiry
GIVEN an authenticated user and an existing file key
WHEN the user sends `POST /api/logs/example.log/presign` with body `{ expiresIn: 7200 }`
THEN the system generates a URL valid for 2 hours (7200 seconds)
AND returns the URL with the calculated `expiresAt`

---

### Requirement: Health Check Endpoint
WHEN a GET request is made to `/api/health`,
the system SHALL return service health status.

#### Scenario: Service Healthy
GIVEN the server is running
WHEN a request is sent to `GET /api/health`
THEN the system returns HTTP 200
AND the response body contains `{ status: "ok", timestamp: string, uptime: number }`