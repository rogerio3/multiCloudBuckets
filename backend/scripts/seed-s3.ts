/**
 * Seeds an S3 bucket with the same realistic sample logs used by the mock
 * provider. Works against real AWS or a local emulator (LocalStack/MinIO).
 *
 * Usage (from backend/):
 *   npx tsx scripts/seed-s3.ts
 *
 * Env (same names as the app config):
 *   AWS_REGION (default us-east-1), AWS_BUCKET (required),
 *   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (any value for LocalStack),
 *   AWS_ENDPOINT (e.g. http://localhost:4566 for LocalStack)
 */
import {
  CreateBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { generateSampleFiles } from '../src/storage/sample-data';

async function main(): Promise<void> {
  const bucket = process.env.AWS_BUCKET;
  if (!bucket) {
    throw new Error('AWS_BUCKET is required');
  }

  const client = new S3Client({
    region: process.env.AWS_REGION ?? 'us-east-1',
    ...(process.env.AWS_ENDPOINT
      ? {
          endpoint: process.env.AWS_ENDPOINT,
          forcePathStyle: true,
          credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID ?? 'test',
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? 'test',
          },
        }
      : {}),
  });

  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`created bucket ${bucket}`);
  } catch (err) {
    const name = (err as { name?: string }).name;
    if (name === 'BucketAlreadyOwnedByYou' || name === 'BucketAlreadyExists') {
      console.log(`bucket ${bucket} already exists — reusing`);
    } else {
      throw err;
    }
  }

  const files = generateSampleFiles();
  for (const file of files) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: file.key,
        Body: file.content,
        ContentType: 'text/plain',
      }),
    );
    console.log(`uploaded s3://${bucket}/${file.key} (${file.content.length} bytes)`);
  }
  console.log(`seeded ${files.length} log files into ${bucket}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});