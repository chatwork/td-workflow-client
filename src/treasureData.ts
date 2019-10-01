'use strict';
import * as AWS from 'aws-sdk';
import moment from 'moment';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
export interface Option extends AxiosRequestConfig {}

AWS.config.update({
  region: process.env.AWS_REGION
});

export type TreasureDataSecret = {
  API_TOKEN: string;
};

export type TreasureDataExecuteOutput = {
  id: string;
  index: number;
  project: {
    id: string;
    name: string;
  };
  workflow: {
    name: string;
    id: string;
  };
  sessionId: string;
  sessionUuid: string;
  sessionTime: string;
  retryAttemptName: string;
  done: boolean;
  success: boolean;
  cancelRequested: boolean;
  params: object;
  createdAt: string; //  ISO8601 format
  finishedAt: string; // ISO8601 format
};

export type TreasureDataGetStatusOutput = {
  id: string;
  project: {
    id: string;
    name: string;
  };
  workflow: {
    name: string;
    id: string;
  };
  sessionUuid: string;
  sessionTime: string;
  lastAttempt: {
    id: string;
    retryAttemptName: string;
    done: boolean;
    success: boolean;
    cancelRequested: boolean;
    params: {
      last_session_time: string; //          ISO8601 format
      next_session_time: string; //          ISO8601 format
      last_executed_session_time: string; // ISO8601 format
    };
    createdAt: string; //  ISO8601 format
    finishedAt: string; // ISO8601 format
  };
};

type TreasureDataGetProjectsOutput = {
  projects: TreasureDataGetProjectsOutputElement[];
};

type TreasureDataGetProjectsOutputElement = {
  id: string;
  name: string;
  revision: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string;
  archiveType: string;
  archiveMd5: string;
};

type TreasureDataGetWorkflowsOutput = {
  workflows: TreasureDataGetWorkflowsOutputElement[];
};

type TreasureDataGetWorkflowsOutputElement = {
  id: string;
  name: string;
  project: {
    id: string;
    name: string;
  };
  revision: string;
  timezone: string;
  config: object;
};

export class TreasureData {
  private axios: AxiosInstance;

  constructor() {}

  /**
   * axiosにのオブジェクトインスタンスを取得する
   * テストでモックするときにこのメソッドを使用する
   * @return {AxiosInstance} axiosのオブジェクトインスタンス
   */
  public getInstance = (): AxiosInstance => {
    return this.axios;
  };

  /**
   * インスタンスを初期化する
   * @param {Secret} secret  (オプション)シークレット情報が既に判明している場合に指定
   */
  public init = async (secret?: TreasureDataSecret): Promise<void> => {
    if (!secret) {
      // ChatworkBotのトークンを取得
      const secretManager = new AWS.SecretsManager();
      const secretJson = await secretManager
        .getSecretValue({ SecretId: 'treasuredata/bot' })
        .promise()
        .then(value => {
          return value.SecretString;
        });
      secret = JSON.parse(secretJson);
    }
    const option: Option = {
      baseURL: 'https://api-workflow.treasuredata.com',
      headers: {
        AUTHORIZATION: `TD1 ${secret.API_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    };

    this.axios = axios.create(option);
  };

  /**
   * 指定の Workflow を実行する
   * @param {string} projectName  TreasureData Workflow の対象のプロジェクト名
   * @param {string} workflowName TreasureData Workflow の対象の Workflow 名
   * @return {Promise<TreasureDataExecuteOutput>}
   */
  public executeWorkflow = async (
    projectName: string,
    workflowName: string
  ): Promise<TreasureDataExecuteOutput> => {
    const projectId = await this.getProjectId(projectName);

    if (projectId === null) {
      throw new Error('指定の Project 名が見つかりません。');
    }

    const workflowId = await this.getWorkflowId(workflowName, projectId);

    if (workflowId === null) {
      throw new Error('指定の Workflow 名が見つかりません。');
    }

    const path = 'api/attempts';
    const params = {
      sessionTime: moment().toISOString(),
      workflowId: workflowId,
      params: {}
    };

    const result = await this.axios.put(path, params);

    if (result.status !== 200) {
      throw new Error('サーバーのレスポンスが不正です。');
    }

    return result.data as TreasureDataExecuteOutput;
  };

  /**
   * 指定した Workflow のステータスを取得する
   * @param {string} sessionId 指定する Workflow の Session ID
   * @return {Promise<TreasureDataExecuteOutput>}
   */
  public getWorkflowStatus = async (sessionId: string): Promise<TreasureDataGetStatusOutput> => {
    const path = `api/sessions/${sessionId}`;

    const result = await this.axios.get(path);

    if (result.status !== 200) {
      throw new Error('サーバーのレスポンスが不正です。');
    }

    return result.data as TreasureDataGetStatusOutput;
  };

  /**
   * 指定したプロジェクトの ID を取得する
   * @param {string} name 指定するプロジェクト名
   * @return {string}     プロジェクト ID。見つからなければ null を返す
   */
  public getProjectId = async (name: string): Promise<string> => {
    const path = 'api/projects';
    const result = await this.axios.get(path);

    if (result.status !== 200) {
      throw new Error('サーバーのレスポンスが不正です。');
    }

    const json = result.data as TreasureDataGetProjectsOutput;

    const filtered = json.projects.filter(item => item.name === name);

    if (filtered.length === 0) {
      return null;
    }

    return filtered[0].id;
  };

  /**
   * 指定した workflow の ID を取得する
   * @param {string} name      指定する workflow 名
   * @param {string} projectId workflow が属するプロジェクトの ID
   * @return {string}          workflow の ID。見つからなければ null を返す
   */
  public getWorkflowId = async (name: string, projectId: string): Promise<string> => {
    const path = `api/projects/${projectId}/workflows`;
    const result = await this.axios.get(path);

    if (result.status !== 200) {
      throw new Error('サーバーのレスポンスが不正です。');
    }

    const json = result.data as TreasureDataGetWorkflowsOutput;

    const filtered = json.workflows.filter(item => item.name === name);

    if (filtered.length === 0) {
      return null;
    }

    return filtered[0].id;
  };
}
