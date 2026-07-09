import { spawn, type ChildProcess } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { Readable, Writable } from 'node:stream';
import * as acp from '@agentclientprotocol/sdk';

type OuterConnection = {
  sessionUpdate: (params: unknown) => Promise<unknown>;
  requestPermission: (params: unknown) => Promise<unknown>;
};

type BridgeSessionState = {
  child: ChildProcess;
  connection: acp.ClientSideConnection;
  traexSessionId: string;
};

export function createBridgePromptRequest(input: {
  employeeId: string;
  threadKey: string;
  text: string;
  ownerUserId: string;
  channelType?: 'manager_dm' | 'internal_staff_group' | 'project_group';
}) {
  const channelType = input.channelType ?? 'manager_dm';
  return {
    employeeId: input.employeeId,
    threadKey: input.threadKey,
    channelType,
    senderOpenId: input.ownerUserId,
    senderRole: channelType === 'manager_dm' ? 'manager' : 'internal_staff',
    body: input.text.trim(),
  };
}

class ForwardingClient {
  constructor(
    private readonly outerConnection: OuterConnection,
    private readonly outerSessionId: string,
  ) {}

  async sessionUpdate(params: { update: unknown }) {
    await this.outerConnection.sessionUpdate({
      sessionId: this.outerSessionId,
      update: params.update,
    });
    return {};
  }

  async requestPermission(params: Record<string, unknown>) {
    return this.outerConnection.requestPermission({
      ...params,
      sessionId: this.outerSessionId,
    });
  }

  async writeTextFile() {
    return {};
  }

  async readTextFile() {
    return { content: '' };
  }
}

async function createTraexBridgeSession(input: {
  outerConnection: OuterConnection;
  outerSessionId: string;
  cwd: string;
}) {
  const child = spawn('traex', ['acp', 'serve'], {
    cwd: input.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  const stream = acp.ndJsonStream(
    Writable.toWeb(child.stdin as NodeJS.WritableStream),
    Readable.toWeb(child.stdout as NodeJS.ReadableStream),
  );
  const connection = new acp.ClientSideConnection(
    () => new ForwardingClient(input.outerConnection, input.outerSessionId),
    stream,
  );

  await connection.initialize({
    protocolVersion: acp.PROTOCOL_VERSION,
    clientInfo: {
      name: 'rdleader-feishu-bridge',
      version: '0.1.0',
    },
    clientCapabilities: {},
  });

  const session = await connection.newSession({
    cwd: input.cwd,
    mcpServers: [],
  });

  return {
    child,
    connection,
    traexSessionId: session.sessionId,
  } satisfies BridgeSessionState;
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
          promptCapabilities: {
            image: false,
            audio: false,
            embeddedContext: false,
          },
          sessionCapabilities: {
            list: {},
            close: {},
          },
        },
      };
    },

    async newSession(params: { cwd?: string }) {
      const sessionId = `bridge-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const session = await createTraexBridgeSession({
        outerConnection,
        outerSessionId: sessionId,
        cwd: params.cwd ?? deps.cwd,
      });
      sessions.set(sessionId, session);
      return { sessionId };
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

      const response = (await fetch(`${deps.controlUrl}/feishu/bridge/chat`, {
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
          mode: 'direct' | 'runtime_forward';
          replyText?: string;
          promptText?: string;
        };
      })) as {
        mode: 'direct' | 'runtime_forward';
        replyText?: string;
        promptText?: string;
      };

      if (response.mode === 'direct') {
        await outerConnection.sessionUpdate({
          sessionId: params.sessionId,
          update: {
            sessionUpdate: 'agent_message_chunk',
            content: {
              type: 'text',
              text: response.replyText ?? '',
            },
          },
        });
        return { stopReason: 'end_turn' };
      }

      const forwarded = await session.connection.prompt({
        sessionId: session.traexSessionId,
        prompt: [
          {
            type: 'text',
            text: response.promptText ?? '',
          },
        ],
      });

      return {
        stopReason: forwarded.stopReason,
      };
    },

    async cancel(params: { sessionId: string }) {
      const session = sessions.get(params.sessionId);
      if (!session) return {};
      await session.connection.cancel({
        sessionId: session.traexSessionId,
      });
      return {};
    },

    async closeSession(params: { sessionId: string }) {
      const session = sessions.get(params.sessionId);
      if (!session) return {};
      session.child.kill('SIGTERM');
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
