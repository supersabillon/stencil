import type * as d from '../declarations';
import type { IncomingMessage, RequestListener, ServerResponse } from 'http';
import { isDevClient, isDevModule, isExtensionLessPath, isSsrStaticDataPath } from './dev-server-utils';
import { normalizePath } from '@utils';
import { serveDevClient } from './serve-dev-client';
import { serveDevNodeModule } from './serve-dev-node-module';
import { serveDirectoryIndex } from './serve-directory-index';
import { serveFile } from './serve-file';
import { ssrPageRequest, ssrStaticDataRequest } from './ssr-request';
import path from 'path';

/**
 * Create a request handler for a Node HTTPS server
 * @param devServerConfig the Stencil dev-server configuration to apply to the request handler
 * @param serverCtx the dev-server context for the current e2e test run
 * @returns a request listener to be used in a Node server
 */
export function createRequestHandler(devServerConfig: d.DevServerConfig, serverCtx: d.DevServerContext): RequestListener {
  let userRequestHandler: (req: IncomingMessage, res: ServerResponse, next: () => void) => void = null;

  if (typeof devServerConfig.requestListenerPath === 'string') {
    userRequestHandler = require(devServerConfig.requestListenerPath);
  }

  return async function (incomingReq: IncomingMessage, res: ServerResponse) {
    async function defaultHandler() {
      try {
        const req = normalizeHttpRequest(devServerConfig, incomingReq);

        if (!req.url) {
          return serverCtx.serve302(req, res);
        }

        if (isDevClient(req.pathname) && devServerConfig.websocket) {
          return serveDevClient(devServerConfig, serverCtx, req, res);
        }

        if (isDevModule(req.pathname)) {
          return serveDevNodeModule(serverCtx, req, res);
        }

        if (!isValidUrlBasePath(devServerConfig.basePath, req.url)) {
          return serverCtx.serve404(
            req,
            res,
            `invalid basePath`,
            `404 File Not Found, base path: ${devServerConfig.basePath}`
          );
        }

        if (devServerConfig.ssr) {
          if (isExtensionLessPath(req.url.pathname)) {
            return ssrPageRequest(devServerConfig, serverCtx, req, res);
          }
          if (isSsrStaticDataPath(req.url.pathname)) {
            return ssrStaticDataRequest(devServerConfig, serverCtx, req, res);
          }
        }

        req.stats = await serverCtx.sys.stat(req.filePath);
        if (req.stats.isFile) {
          return serveFile(devServerConfig, serverCtx, req, res);
        }

        if (req.stats.isDirectory) {
          return serveDirectoryIndex(devServerConfig, serverCtx, req, res);
        }

        const xSource = ['notfound'];
        const validHistoryApi = isValidHistoryApi(devServerConfig, req);
        xSource.push(`validHistoryApi: ${validHistoryApi}`);

        if (validHistoryApi) {
          try {
            const indexFilePath = path.join(devServerConfig.root, devServerConfig.historyApiFallback.index);
            xSource.push(`indexFilePath: ${indexFilePath}`);

            req.stats = await serverCtx.sys.stat(indexFilePath);
            if (req.stats.isFile) {
              req.filePath = indexFilePath;
              return serveFile(devServerConfig, serverCtx, req, res);
            }
          } catch (e) {
            xSource.push(`notfound error: ${e}`);
          }
        }

        return serverCtx.serve404(req, res, xSource.join(', '));
      } catch (e) {
        return serverCtx.serve500(incomingReq, res, e, `not found error`);
      }
    }

    if (typeof userRequestHandler === 'function') {
      await userRequestHandler(incomingReq, res, defaultHandler);
    } else {
      await defaultHandler();
    }
  };
}

export function isValidUrlBasePath(basePath: string, url: URL) {
  // normalize the paths to always end with a slash for the check
  let pathname = url.pathname;
  if (!pathname.endsWith('/')) {
    pathname += '/';
  }
  if (!basePath.endsWith('/')) {
    basePath += '/';
  }
  return pathname.startsWith(basePath);
}

/**
 * Normalize an incoming HTTP request by TODO(NOW)
 * @param devServerConfig the Stencil dev server configuration to use when servicing requests
 * @param incomingReq the incoming request to the server
 * @returns the normalized request
 */
function normalizeHttpRequest(devServerConfig: d.DevServerConfig, incomingReq: IncomingMessage): d.HttpRequest {
  // console.log(`request-handler#normalizeHttpRequest ${JSON.stringify(Object.entries(incomingReq), null, 2)}`)
  const req: d.HttpRequest = {
    method: (incomingReq.method || 'GET').toUpperCase() as any,
    headers: incomingReq.headers as any,
    acceptHeader:
      (incomingReq.headers && typeof incomingReq.headers.accept === 'string' && incomingReq.headers.accept) || '',
    host: (incomingReq.headers && typeof incomingReq.headers.host === 'string' && incomingReq.headers.host) || null,
    url: null,
    searchParams: null,
  };

  const incomingUrl = (incomingReq.url || '').trim() || null;
  if (incomingUrl) {
    if (req.host) {
      req.url = new URL(incomingReq.url, `http://${req.host}`);
    } else {
      req.url = new URL(incomingReq.url, `http://dev.stenciljs.com`);
    }
    console.log(`request-handler#normalizeHttpRequest incomingReq.url ${incomingReq.url}`)
    console.log(`request-handler#normalizeHttpRequest req.url ${req.url}`)
    req.searchParams = req.url.searchParams;
  }

  if (req.url) {
    const parts = req.url.pathname.replace(/\\/g, '/').split('/');
    console.log(`request-handler#normalizeHttpRequest parts ${JSON.stringify(parts, null, 2)}`)

    req.pathname = parts.map((part) => decodeURIComponent(part)).join('/');
    if (req.pathname.length > 0 && !isDevClient(req.pathname)) {
      req.pathname = '/' + req.pathname.substring(devServerConfig.basePath.length);
      console.log(`request-handler#normalizeHttpRequest req.pathname ${req.pathname}`)
    }

    req.filePath = normalizePath(path.normalize(path.join(devServerConfig.root, path.relative('/', req.pathname))));
    console.log(`request-handler#normalizeHttpRequest req.filePath ${req.filePath}`)
  }

  console.log(`request-handler#normalizeHttpRequest req ${JSON.stringify(Object.entries(req), null, 2)}`)
  return req;
}

export function isValidHistoryApi(devServerConfig: d.DevServerConfig, req: d.HttpRequest) {
  if (!devServerConfig.historyApiFallback) {
    return false;
  }
  if (req.method !== 'GET') {
    return false;
  }
  if (!req.acceptHeader.includes('text/html')) {
    return false;
  }
  if (!devServerConfig.historyApiFallback.disableDotRule && req.pathname.includes('.')) {
    return false;
  }
  return true;
}
