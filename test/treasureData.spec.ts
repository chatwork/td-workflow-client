'use strict';
import MockAdapter from 'axios-mock-adapter';
import {
  TreasureData as TDWorkflow,
  TreasureDataSecret,
  TreasureDataGetExecutedWorkflowStatusOutput,
  TreasureDataGetProjectsOutputElement
} from '../src/treasureData';

jest.unmock('../src/treasureData');

const secret: TreasureDataSecret = {
  API_TOKEN: 'XXXXXXX'
};

let tdw: TDWorkflow;
let mockAxios: MockAdapter;

describe('TDWorkflow', () => {
  beforeEach(async () => {
    // テストごとに各インスタンスは初期化しておく
    tdw = new TDWorkflow(secret);
    mockAxios = new MockAdapter(tdw.getInstance());
  });

  xdescribe('getWorkflowStatus()', () => {
    it('Success.', async () => {
      tdw = new TDWorkflow(secret);

      const attemptId = '13472853';
      const result: TreasureDataGetExecutedWorkflowStatusOutput = {
        id: '13472853',
        index: 1,
        project: {
          id: '252525',
          name: 'hogehoge'
        },
        workflow: {
          name: 'test_workflow_pj',
          id: '121212121'
        },
        sessionId: '12341234',
        sessionUuid: 'q23r32rq23ro[k[poiu[iag',
        sessionTime: '2019-11-14T16:07:20+09:00',
        retryAttemptName: null,
        done: true,
        success: true,
        cancelRequested: false,
        params: {},
        createdAt: '2019-11-14T07:07:10Z',
        finishedAt: '2019-11-14T07:21:32Z'
      };

      // axios.getをモック
      mockAxios.onGet(`api/attempts/${attemptId}`).reply(200, result);

      const response = await tdw.getExecutedWorkflowStatus('13472853');
      expect(response.sessionUuid).toBe('q23r32rq23ro[k[poiu[iag');
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
