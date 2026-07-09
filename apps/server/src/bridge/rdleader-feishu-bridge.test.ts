import { describe, expect, it } from 'vitest';
import { createBridgePromptRequest } from './rdleader-feishu-bridge';

describe('rdleader feishu bridge agent', () => {
  it('maps LarkLink prompt payload into an RDLeader bridge request', () => {
    expect(
      createBridgePromptRequest({
        employeeId: 'lushirong',
        threadKey: 'dm:boss:lushirong',
        text: '你今天进展如何？',
        ownerUserId: 'ou_manager',
      }),
    ).toMatchObject({
      employeeId: 'lushirong',
      threadKey: 'dm:boss:lushirong',
      channelType: 'manager_dm',
      senderOpenId: 'ou_manager',
      senderRole: 'manager',
      body: '你今天进展如何？',
    });
  });
});
