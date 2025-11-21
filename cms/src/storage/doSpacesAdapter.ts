import { S3Client } from '@aws-sdk/client-s3';

export const s3Client = new S3Client({
  region: process.env.DO_SPACES_REGION,
  endpoint: process.env.DO_SPACES_ENDPOINT,
  forcePathStyle: false,
  credentials: {
    accessKeyId: process.env.DO_SPACES_KEY as string,
    secretAccessKey: process.env.DO_SPACES_SECRET as string,
  },
});
