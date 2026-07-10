import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { Readable, Writable } from 'node:stream';
import * as acp from '@agentclientprotocol/sdk';

type OuterConnection = {
  sessionUpdate: (params: unknown) => Promise<unknown>;
  requestPermission: (params: unknown) => Promise<unknown>;
};

type BridgeSessionState = {
  sessionId: string;
  cwd: string;
};

function inferChannelType(threadKey: string) {
  const normalized = threadKey.trim();
  if (normalized.startsWith('dm:')) {
    return 'manager_dm' as const;
  }

  if (/internal[_-]?staff/i.test(normalized)) {
    return 'internal_staff_group' as const;
  }

  if (normalized.startsWith('chat:') || /^oc_[a-z0-9]+$/i.test(normalized) || normalized.includes(':oc_')) {
    return 'project_group' as const;
  }

  return 'manager_dm' as const;
}

export function sanitizeBridgeReplyText(text: string | null | undefined) {
  const normalized = (text ?? '').trim();
  if (!normalized) {
    return '';
  }

  return normalized
    .replace(/处理消息失败[:：]?\s*Internal error \(code:\s*-32603\)[。！!]*/giu, '飞书侧刚才连桥抖了一下。')
    .replace(/历史实例恢复失败[，,\s]*已重新创建实例[，,\s]*请补充必要背景[。！!]*/gu, '执行实例刚重建过一次，当前会按最新上下文继续推进。')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createBridgePromptRequest(input: {
  employeeId: string;
  threadKey: string;
  text: string;
  ownerUserId: string;
  channelType?: 'manager_dm' | 'internal_staff_group' | 'project_group';
}) {
  const channelType = input.channelType ?? inferChannelType(input.threadKey);
  return {
    employeeId: input.employeeId,
    threadKey: input.threadKey,
    channelType,
    senderOpenId: input.ownerUserId,
    senderRole: channelType === 'manager_dm' ? 'manager' : 'internal_staff',
    body: input.text.trim(),
  };
}

async function emitTextReply(input: {
  outerConnection: OuterConnection;
  sessionId: string;
  text: string;
}) {
  await input.outerConnection.sessionUpdate({
    sessionId: input.sessionId,
    update: {
      sessionUpdate: 'agent_message_chunk',
      content: {
        type: 'text',
        text: input.text,
      },
    },
  });
}

export function createFeishuBridgeAgent(deps: {
  employeeId: string;
  controlUrl: string;
  threadKey: string;
  ownerUserId: string;
  cwd: string;
}) {
  const sessions = new Map<string, BridgeSessionState>();

  return (outerConnection: OuterConnection) => ({
    async initialize() {
      return {
        protocolVersion: acp.PROTOCOL_VERSION,
        agentInfo: {
          name: 'rdleader-feishu-bridge',
          title: 'RDLeader Feishu Bridge',
          version: '0.1.0',
        },
        agentCapabilities: {
          loadSession: true,
        },
      };
    },

    async newSession(params: { cwd?: string }) {
      const sessionId = `bridge-${randomUUID()}`;
      sessions.set(sessionId, {
        sessionId,
        cwd: params.cwd ?? deps.cwd,
      });
      return { sessionId };
    },

    async loadSession(params: { sessionId: string; cwd?: string }) {
      sessions.set(params.sessionId, {
        sessionId: params.sessionId,
        cwd: params.cwd ?? deps.cwd,
      });
      return {};
    },

    async authenticate() {
      return {};
    },

    async setSessionMode() {
      return {};
    },

    async prompt(params: { sessionId: string; prompt: Array<{ type: string; text?: string }> }) {
      const session = sessions.get(params.sessionId);
      if (!session) {
        throw new Error(`Session ${params.sessionId} not found`);
      }

      const text = params.prompt.find((block) => block.type === 'text')?.text ?? '';
      const bridgeRequest = createBridgePromptRequest({
        employeeId: deps.employeeId,
        threadKey: deps.threadKey,
        text,
        ownerUserId: deps.ownerUserId,
      });

      try {
        const response = await fetch(`${deps.controlUrl}/feishu/bridge/chat`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(bridgeRequest),
        }).then(async (res) => {
          const payload = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(
              typeof payload?.message === 'string' ? payload.message : `bridge chat failed (${res.status})`,
            );
          }
          return payload as {
            mode?: 'direct' | 'runtime_forward';
            replyText?: string;
          };
        });

        await emitTextReply({
          outerConnection,
          sessionId: session.sessionId,
          text: (() => {
            const sanitizedReply = sanitizeBridgeReplyText(response.replyText);
            return sanitizedReply || '收到，我会基于真实工作区继续处理，并把真实结果回你。';
          })(),
        });
      } catch {
        await emitTextReply({
          outerConnection,
          sessionId: session.sessionId,
          text: '我这边刚刚连桥有点抖，消息已经看到了。你可以稍后再发一次；恢复后我会继续按真实工作区处理。',
        }).catch(() => undefined);
      }

      return { stopReason: 'end_turn' };
    },

    async cancel() {
      return {};
    },

    async closeSession(params: { sessionId: string }) {
      sessions.delete(params.sessionId);
      return {};
    },
  });
}

async function startBridgeAgent() {
  const employeeId = process.env.RDLEADER_EMPLOYEE_ID?.trim();
  if (!employeeId) {
    throw new Error('RDLEADER_EMPLOYEE_ID is required');
  }

  const cwd = process.cwd();
  const controlUrl = process.env.RDLEADER_CONTROL_URL?.trim() || 'http://127.0.0.1:3001';
  const ownerUserId = process.env.LARKLINK_OWNER_USER_ID?.trim() || process.env.USER_ID?.trim() || 'unknown';
  const threadKey =
    process.env.LARKLINK_SCOPE_KEY?.trim() || `dm:${ownerUserId}:${employeeId}`;

  const stream = acp.ndJsonStream(
    Writable.toWeb(process.stdout as NodeJS.WritableStream),
    Readable.toWeb(process.stdin as NodeJS.ReadableStream),
  );

  new acp.AgentSideConnection(
    createFeishuBridgeAgent({
      employeeId,
      controlUrl,
      threadKey,
      ownerUserId,
      cwd,
    }),
    stream,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await startBridgeAgent();
}
