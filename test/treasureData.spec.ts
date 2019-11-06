'use strict';
import MockAdapter from 'axios-mock-adapter';
import {
  TreasureData as TDWorkflow,
  TreasureDataSecret,
  TreasureDataGetStatusOutput,
  TreasureDataGetProjectsOutputElement
} from '../src/treasureData';

jest.unmock('../src/treasureData');

const secret: TreasureDataSecret = {
  API_TOKEN: 'XXXXXXX'
};

let tdw: TDWorkflow;
let mockAxios: MockAdapter = null;

describe('TDWorkflow', () => {
  beforeEach(async () => {
    // テストごとに各インスタンスは初期化しておく
    tdw = new TDWorkflow(secret);
    mockAxios = new MockAdapter(tdw.getInstance());
  });

  xdescribe('getWorkflowStatus()', () => {
    it('Success.', async () => {
      tdw = new TDWorkflow(secret);

      const sessionId = '13472853';
      const result: TreasureDataGetStatusOutput = {
        id: '123456789',
        project: {
          id: '123456',
          name: 'test-pj'
        },
        workflow: {
          name: 'test-wf',
          id: '123456'
        },
        sessionUuid: '7ef19574-ca23-48fb-828d-aa7cd9da37d4',
        sessionTime: '123456789',
        lastAttempt: {
          id: '123456789',
          retryAttemptName: 'test-wf',
          done: false,
          success: false,
          cancelRequested: false,
          params: {
            last_session_time: '2014-10-10T13:50:40Z', //          ISO8601 format
            next_session_time: '2014-10-10T13:50:40Z', //          ISO8601 format
            last_executed_session_time: '2014-10-10T13:50:40Z' // ISO8601 format
          },
          createdAt: '2014-10-10T13:50:40Z', //  ISO8601 format
          finishedAt: '2014-10-10T13:50:40Z' // ISO8601 format
        }
      };

      // axios.getをモック
      mockAxios.onGet(`api/sessions/${sessionId}`).reply(200, result);

      const response = await tdw.getWorkflowStatus('13472853');
      expect(response.sessionUuid).toBe('7ef19574-ca23-48fb-828d-aa7cd9da37d4');
    });
  });

  describe('deployWorkflow()', () => {
    it('Success - string only.', async () => {
      const projectName = 'td-workflow-test';
      const srcDirPath = './test/workflows';
      const zipFilePath = './test/output/test.tar.gz';

      const projectId = '123456';

      const revision = '123456789';

      const dataResult: TreasureDataGetProjectsOutputElement = {
        id: projectId,
        name: 'test-pj',
        revision: '8a44042d-9e0c-4821-a4ef-4813e56816db',
        createdAt: '2019-11-06T07:19:18Z',
        updatedAt: '2019-11-06T07:34:13Z',
        deletedAt: null,
        archiveType: 's3',
        archiveMd5: '5MA/WDRkRij8gyZWwi5wWg=='
      };

      // axios.postをモック
      mockAxios.onPut(`api/projects?project=${projectName}&revision=${revision}`).reply(200, {
        status: 200,
        data: dataResult
      });

      await tdw.deployWorkflow(srcDirPath, zipFilePath, projectName, revision);
    });
  });
});
