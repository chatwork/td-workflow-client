'use strict';
// import MockAdapter from 'axios-mock-adapter';
import { TreasureData as TDWorkflow, TreasureDataSecret } from '../src/treasureData';

// jest.unmock('../src/treasureData');

const secret: TreasureDataSecret = {
  API_TOKEN: 'XXXXXXX'
};

let tdw: TDWorkflow;
// let mockAxios = null;

describe('TDWorkflow', () => {
  beforeEach(async () => {
    // テストごとに各インスタンスは初期化しておく
    tdw = new TDWorkflow(secret);
    // mockAxios = new MockAdapter(tdw.getInstance());
  });

  xdescribe('getWorkflowStatus()', () => {
    it('Success.', async () => {
      tdw = new TDWorkflow(secret);

      const response = await tdw.getWorkflowStatus('13472853');
      expect(response.sessionUuid).toBe('7ef19574-ca23-48fb-828d-aa7cd9da37d4');
    });
  });

  describe('deployWorkflow()', () => {
    it('Success - string only.', async () => {
      const projectName = 'td-workflow-test';
      const digfilePath = 'test/workflows/test.dig';

      await tdw.deployWorkflow(digfilePath, projectName);
    });
  });
});
