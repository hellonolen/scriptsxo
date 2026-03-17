// AWS SigV4 SNS Publisher for Cloudflare Workers (Web Crypto API — no Node.js)

export interface SNSEnv {
  AWS_ACCESS_KEY_ID: string;
  AWS_SECRET_ACCESS_KEY: string;
  AWS_REGION: string;
}

async function hmacSHA256(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const rawKey = key instanceof ArrayBuffer ? key : key.buffer as ArrayBuffer;
  const cryptoKey = await crypto.subtle.importKey(
    'raw', rawKey,
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: string): Promise<string> {
  const hash = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return toHex(hash);
}

function toHex(buf: ArrayBuffer): string {
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function buildSignedRequest(
  env: SNSEnv,
  bodyParams: Record<string, string>
): Promise<{ headers: Record<string, string>; body: string; endpoint: string }> {
  const region = env.AWS_REGION || 'us-east-1';
  const host = `sns.${region}.amazonaws.com`;
  const endpoint = `https://${host}/`;

  const sortedKeys = Object.keys(bodyParams).sort();
  const bodyStr = sortedKeys
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(bodyParams[k])}`)
    .join('&');

  const now = new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z/, 'Z');
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256Hex(bodyStr);
  const canonicalHeaders = `content-type:application/x-www-form-urlencoded\nhost:${host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = 'content-type;host;x-amz-date';
  const canonicalRequest = `POST\n/\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;

  const credentialScope = `${dateStamp}/${region}/sns/aws4_request`;
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${await sha256Hex(canonicalRequest)}`;

  const kDate = await hmacSHA256(new TextEncoder().encode(`AWS4${env.AWS_SECRET_ACCESS_KEY}`), dateStamp);
  const kRegion = await hmacSHA256(kDate, region);
  const kService = await hmacSHA256(kRegion, 'sns');
  const kSigning = await hmacSHA256(kService, 'aws4_request');
  const signature = toHex(await hmacSHA256(kSigning, stringToSign));

  const authHeader = `AWS4-HMAC-SHA256 Credential=${env.AWS_ACCESS_KEY_ID}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return {
    endpoint,
    body: bodyStr,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Amz-Date': amzDate,
      'Authorization': authHeader,
    },
  };
}

export interface SNSPublishParams {
  topicArn?: string;
  targetArn?: string;
  phoneNumber?: string;
  subject?: string;
  message: string;
  messageAttributes?: Record<string, { DataType: string; StringValue: string }>;
}

export async function snsPublish(
  env: SNSEnv,
  params: SNSPublishParams
): Promise<{ MessageId: string } | null> {
  const bodyParams: Record<string, string> = {
    Action: 'Publish',
    Version: '2010-03-31',
    Message: params.message,
  };

  if (params.topicArn) bodyParams['TopicArn'] = params.topicArn;
  if (params.targetArn) bodyParams['TargetArn'] = params.targetArn;
  if (params.phoneNumber) bodyParams['PhoneNumber'] = params.phoneNumber;
  if (params.subject) bodyParams['Subject'] = params.subject;

  if (params.messageAttributes) {
    let i = 1;
    for (const [name, attr] of Object.entries(params.messageAttributes)) {
      bodyParams[`MessageAttributes.entry.${i}.Name`] = name;
      bodyParams[`MessageAttributes.entry.${i}.Value.DataType`] = attr.DataType;
      bodyParams[`MessageAttributes.entry.${i}.Value.StringValue`] = attr.StringValue;
      i++;
    }
  }

  const { endpoint, body, headers } = await buildSignedRequest(env, bodyParams);

  try {
    const res = await fetch(endpoint, { method: 'POST', headers, body });
    const text = await res.text();
    if (!res.ok) {
      console.error('[SNS] publish error:', res.status, text);
      return null;
    }
    const match = text.match(/<MessageId>([^<]+)<\/MessageId>/);
    return match ? { MessageId: match[1] } : null;
  } catch (err) {
    console.error('[SNS] publish fetch error:', err);
    return null;
  }
}

export async function snsCreateTopic(env: SNSEnv, topicName: string): Promise<string | null> {
  const bodyParams: Record<string, string> = {
    Action: 'CreateTopic',
    Version: '2010-03-31',
    Name: topicName,
  };

  const { endpoint, body, headers } = await buildSignedRequest(env, bodyParams);

  try {
    const res = await fetch(endpoint, { method: 'POST', headers, body });
    const text = await res.text();
    if (!res.ok) {
      console.error('[SNS] createTopic error:', res.status, text);
      return null;
    }
    const match = text.match(/<TopicArn>([^<]+)<\/TopicArn>/);
    return match ? match[1] : null;
  } catch (err) {
    console.error('[SNS] createTopic fetch error:', err);
    return null;
  }
}

export async function snsSubscribeEmail(
  env: SNSEnv,
  topicArn: string,
  email: string
): Promise<string | null> {
  const bodyParams: Record<string, string> = {
    Action: 'Subscribe',
    Version: '2010-03-31',
    TopicArn: topicArn,
    Protocol: 'email',
    Endpoint: email,
  };

  const { endpoint, body, headers } = await buildSignedRequest(env, bodyParams);

  try {
    const res = await fetch(endpoint, { method: 'POST', headers, body });
    const text = await res.text();
    if (!res.ok) {
      console.error('[SNS] subscribe error:', res.status, text);
      return null;
    }
    const match = text.match(/<SubscriptionArn>([^<]+)<\/SubscriptionArn>/);
    return match ? match[1] : null;
  } catch (err) {
    console.error('[SNS] subscribe fetch error:', err);
    return null;
  }
}
