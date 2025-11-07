/*
  Usage:
    npm --prefix functions run cors:dev    # allow localhost:5173 dev
    npm --prefix functions run cors:reset  # clear CORS (SDK defaults)

  Requires:
    - Google Cloud SDK auth set up for this machine (Application Default Credentials):
        gcloud auth application-default login
    - The active project set to your Firebase project (or set GOOGLE_CLOUD_PROJECT):
        gcloud config set project <projectId>
*/
const { Storage } = require('@google-cloud/storage');

async function main() {
  const mode = process.argv[2] || 'dev';
  const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
  if (!projectId) {
    console.error('Set GOOGLE_CLOUD_PROJECT or run: gcloud config set project <projectId>');
    process.exit(1);
  }
  const bucketName = process.env.BUCKET || `${projectId}.appspot.com`;

  const storage = new Storage({ projectId });
  const bucket = storage.bucket(bucketName);

  if (mode === 'reset') {
    await bucket.setCorsConfiguration([]);
    console.log(`CORS reset to empty on gs://${bucketName}`);
    return;
  }

  // Dev-friendly CORS for Vite on localhost:5173
  const config = [
    {
      origin: ['http://localhost:5173'],
      method: ['GET', 'POST', 'PUT', 'HEAD', 'OPTIONS'],
      responseHeader: ['Authorization', 'Content-Type', 'x-goog-*', 'x-client-data', 'x-firebase-gmpid'],
      maxAgeSeconds: 3600,
    },
  ];

  await bucket.setCorsConfiguration(config);
  console.log(`CORS updated on gs://${bucketName} for http://localhost:5173`);
}

main().catch((e) => {
  console.error('Failed to set CORS:', e);
  process.exit(1);
});

