const API_URL        = process.env.E2E_API_URL ?? 'http://localhost:3001';
const S3_URL         = process.env.E2E_S3_URL ?? 'http://localhost:4566';
const POLL_INTERVAL  = 500;
const POLL_TIMEOUT   = 15000;
const IMAGE          = Buffer.alloc(70);
const UNKNOWN_JOB_ID = '00000000-0000-4000-8000-000000000000';

interface JobStatus { jobId: string; status: string; error?: string }

const createUpload = async (): Promise<{ jobId: string; uploadUrl: string }> => {
  const res = await fetch(`${API_URL}/v1/uploads`, {
    method  : 'POST',
    headers : { 'content-type': 'application/json' },
    body    : JSON.stringify({ contentType: 'image/png', size: IMAGE.length })
  });
  expect(res.status).toBe(201);
  return res.json() as Promise<{ jobId: string; uploadUrl: string }>;
};

const getJob = async (jobId: string): Promise<JobStatus> => {
  const res = await fetch(`${API_URL}/v1/uploads/${jobId}`);
  expect(res.status).toBe(200);
  return res.json() as Promise<JobStatus>;
};

const waitForStatus = async (jobId: string, expected: string): Promise<JobStatus> => {
  const deadline = Date.now() + POLL_TIMEOUT;
  let job        = await getJob(jobId);

  while (job.status !== expected && Date.now() < deadline) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    job = await getJob(jobId);
  }
  return job;
};



describe('Pipeline de uploads contra LocalStack', () => {

  it('un job nuevo queda PENDING hasta que se sube la imagen', async () => {
    const { jobId } = await createUpload();

    expect(await getJob(jobId)).toEqual({ jobId, status: 'PENDING' });
  });


  it('subir la imagen lleva el job a COMPLETED y deja el WebP en optimized', async () => {
    const { jobId, uploadUrl } = await createUpload();

    const put = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': 'image/png' }, body: IMAGE });
    expect(put.status).toBe(200);

    expect(await waitForStatus(jobId, 'COMPLETED')).toEqual({ jobId, status: 'COMPLETED' });

    const head = await fetch(`${S3_URL}/optimized/optimized/${jobId}.webp`, { method: 'HEAD' });
    expect(head.status).toBe(200);
  });


  it('responde 404 si el job no existe', async () => {
    const res = await fetch(`${API_URL}/v1/uploads/${UNKNOWN_JOB_ID}`);

    expect(res.status).toBe(404);
  });


  it('responde 400 si el id no es un UUID', async () => {
    const res = await fetch(`${API_URL}/v1/uploads/abc`);

    expect(res.status).toBe(400);
  });

});
