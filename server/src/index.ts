import { SocksProxyAgent } from 'socks-proxy-agent';
import nodeFetch from 'node-fetch';
import { app } from './app.js';
import { config } from './config.js';

app.listen(config.port, () => {
  console.log(`Dashboard server listening on http://localhost:${config.port}`);
  console.log(`[startup] retrieval v1 endpoint: ${config.retrievalApiV1Url}`);
  console.log(`[startup] retrieval v2 endpoint: ${config.retrievalApiV2Url}`);
  console.log(
    `[startup] answer shortener endpoint: ${config.answerShortenerApiUrl}`,
  );
  console.log(
    `[startup] socks proxy: ${config.langgraphSocksUrl || '(disabled)'}`,
  );

  // Self-test the SOCKS5 route shortly after startup so tailnet connectivity
  // failures show up in the container logs (instead of only as 502s in the UI).
  if (!config.langgraphSocksUrl) {
    console.log('[startup] SOCKS5 self-test skipped (no proxy configured)');
    return;
  }

  setTimeout(async () => {
    const agent = new SocksProxyAgent(config.langgraphSocksUrl);
    const retrievalHealthUrl = config.retrievalApiV1Url.replace(
      /\/v1\/.*$/,
      '/health',
    );
    console.log(`[startup] SOCKS5 self-test → ${retrievalHealthUrl}`);
    try {
      const res = await (nodeFetch as unknown as typeof fetch)(
        retrievalHealthUrl,
        {
          method: 'GET',
          agent,
          signal: AbortSignal.timeout(10_000),
        } as never,
      );
      const body = await res.text();
      console.log(
        `[startup] SOCKS5 self-test SUCCESS (status=${res.status})`,
      );
      console.log(`[startup] SOCKS5 self-test body: ${body.slice(0, 200)}`);
    } catch (err) {
      const error = err as Error & {
        code?: string;
        errno?: string | number;
        syscall?: string;
      };
      console.log('[startup] SOCKS5 self-test FAILED');
      console.log(`[startup]   error name: ${error.name}`);
      console.log(`[startup]   error message: ${error.message}`);
      if (error.code) console.log(`[startup]   error code: ${error.code}`);
      if (error.errno !== undefined) {
        console.log(`[startup]   error errno: ${error.errno}`);
      }
      if (error.syscall) {
        console.log(`[startup]   error syscall: ${error.syscall}`);
      }
      if (error.stack) console.log(`[startup]   stack: ${error.stack}`);
    }

    // Second probe: hit the answer shortener endpoint's host so we can tell
    // whether the tailnet path to that specific peer is reachable.
    const shortenerHealthUrl = config.answerShortenerApiUrl.replace(
      /\/v1\/.*$/,
      '/health',
    );
    console.log(`[startup] answer shortener self-test → ${shortenerHealthUrl}`);
    try {
      const res = await (nodeFetch as unknown as typeof fetch)(
        shortenerHealthUrl,
        {
          method: 'GET',
          agent,
          signal: AbortSignal.timeout(10_000),
        } as never,
      );
      const body = await res.text();
      console.log(
        `[startup] answer shortener self-test SUCCESS (status=${res.status})`,
      );
      console.log(
        `[startup] answer shortener self-test body: ${body.slice(0, 200)}`,
      );
    } catch (err) {
      const error = err as Error & {
        code?: string;
        errno?: string | number;
        syscall?: string;
      };
      console.log('[startup] answer shortener self-test FAILED');
      console.log(`[startup]   error name: ${error.name}`);
      console.log(`[startup]   error message: ${error.message}`);
      if (error.code) console.log(`[startup]   error code: ${error.code}`);
      if (error.errno !== undefined) {
        console.log(`[startup]   error errno: ${error.errno}`);
      }
      if (error.syscall) {
        console.log(`[startup]   error syscall: ${error.syscall}`);
      }
    }
  }, 5_000);
});
