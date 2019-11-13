'use strict';
import tar from 'tar';
import path from 'path';
import moment from 'moment';
import uuid from 'uuid/v4';
import * as fs from 'fs-extra';
import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
export interface Option extends AxiosRequestConfig {}

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

export type TreasureDataGetProjectsOutputElement = {
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

class TreasureDataError extends Error {}

export class TreasureData {
  private readonly axios: AxiosInstance;
  private readonly option: AxiosRequestConfig;

  constructor(secret: TreasureDataSecret) {
    if (secret === undefined || !secret.API_TOKEN) {
      throw new TreasureDataError('secret は必須です。');
    }

    this.option = {
      baseURL: 'https://api-workflow.treasuredata.com',
      headers: {
        AUTHORIZATION: `TD1 ${secret.API_TOKEN}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      }
    };

    this.axios = axios.create(this.option);
  }

  /**
   * axiosにのオブジェクトインスタンスを取得する
   * テストでモックするときにこのメソッドを使用する
   * @return {AxiosInstance} axiosのオブジェクトインスタンス
   */
  public getInstance = (): AxiosInstance => {
    return this.axios;
  };

  /**
   * Workflow を TreasureData 上にデプロイする
   */
  public deployWorkflow = async (
    srcDirPath: string,
    zipFilePath: string,
    projectName: string,
    revision?: string
  ): Promise<TreasureDataExecuteOutput> => {
    const gzipData = await this.gzipDigFile(srcDirPath, zipFilePath);

    if (revision === undefined) {
      revision = uuid();
    }

    let result;
    try {
      const option: AxiosRequestConfig = {
        baseURL: this.option.baseURL,
        headers: {
          AUTHORIZATION: this.option.headers['AUTHORIZATION'],
          'Content-Type': 'application/gzip',
          'Content-Encoding': 'gzip',
          Accept: 'application/json'
        }
      };

      result = await this.axios.put(
        `api/projects?project=${projectName}&revision=${revision}`,
        gzipData,
        option
      );
    } catch (error) {
      console.error(error);
    }

    if (result.status !== 200) {
      throw new TreasureDataError('サーバーのレスポンスが不正です。');
    }

    return result.data as TreasureDataExecuteOutput;
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
      throw new TreasureDataError('指定の Project 名が見つかりません。');
    }

    const workflowId = await this.getWorkflowId(workflowName, projectId);

    if (workflowId === null) {
      throw new TreasureDataError('指定の Workflow 名が見つかりません。');
    }

    const params = {
      sessionTime: moment().toISOString(),
      workflowId: workflowId,
      params: {}
    };

    const result = await this.axios.put('api/attempts', params);

    if (result.status !== 200) {
      throw new TreasureDataError('サーバーのレスポンスが不正です。');
    }

    return result.data as TreasureDataExecuteOutput;
  };

  /**
   * 指定した Workflow のステータスを取得する
   * @param {string} sessionId 指定する Workflow の Session ID
   * @return {Promise<TreasureDataExecuteOutput>}
   */
  public getWorkflowStatus = async (sessionId: string): Promise<TreasureDataGetStatusOutput> => {
    const result = await this.axios.get(`api/sessions/${sessionId}`);

    if (result.status !== 200) {
      throw new TreasureDataError('サーバーのレスポンスが不正です。');
    }

    return result.data as TreasureDataGetStatusOutput;
  };

  /**
   * 指定した Project にシークレットを登録する
   * @param {string} projectName TreasureData Workflow の対象のプロジェクト名
   * @param {string} secretKey   シークレットの識別子
   * @param {string} secretValue シークレットの値
   * @return {Promise<void>}
   */
  public setSecret = async (
    projectName: string,
    key: string,
    value: string
  ): Promise<TreasureDataGetStatusOutput> => {
    const projectId = await this.getProjectId(projectName);

    if (projectId === null) {
      throw new TreasureDataError('指定の Project 名が見つかりません。');
    }

    const param = {
      value: value
    };

    const result = await this.axios.put(`api/projects/${projectId}/secrets/${key}`, param);

    if (result.status !== 204) {
      throw new TreasureDataError('サーバーのレスポンスが不正です。');
    }

    return;
  };

  /**
   * 指定したプロジェクトの ID を取得する
   * @param {string} name 指定するプロジェクト名
   * @return {string}     プロジェクト ID。見つからなければ null を返す
   */
  public getProjectId = async (name: string): Promise<string> => {
    const result = await this.axios.get('api/projects');

    if (result.status !== 200) {
      throw new TreasureDataError('サーバーのレスポンスが不正です。');
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
    const result = await this.axios.get(`api/projects/${projectId}/workflows`);

    if (result.status !== 200) {
      throw new TreasureDataError('サーバーのレスポンスが不正です。');
    }

    const json = result.data as TreasureDataGetWorkflowsOutput;

    const filtered = json.workflows.filter(item => item.name === name);

    if (filtered.length === 0) {
      return null;
    }

    return filtered[0].id;
  };

  /**
   * 指定したワークフロー定義ファイルを読み込んで gzip 圧縮
   * @param {string} srcDirPath  ワークフロー定義ファイルのパス
   * @return {Buffer}             圧縮されたワークフロー定義ファイルのデータ
   */
  private gzipDigFile = async (srcDirPath: string, zipFilePath?: string): Promise<Buffer> => {
    // gzip 圧縮したファイルの保存先
    if (zipFilePath === undefined) {
      zipFilePath = process.cwd();
    }
    if (!fs.existsSync(srcDirPath)) {
      throw new TreasureDataError('指定されたワークフロー定義ファイルが見つかりません。');
    }

    const fileList = this.getFileList(srcDirPath);

    try {
      const destPath = path.parse(zipFilePath);

      fs.mkdirsSync(destPath.dir);

      await tar.create(
        {
          gzip: true,
          cwd: srcDirPath,
          file: zipFilePath,
          portable: true
        },
        fileList
      );

      return fs.readFileSync(zipFilePath);
    } catch (error) {
      throw new TreasureDataError(
        `指定されたワークフロー定義ファイルの gzip 圧縮に失敗しました。 error = ${error}`
      );
    }
  };

  /**
   * 指定ディレクトリ配下のファイル一覧を取得する
   * @param {string} srcDirPath   ファイル一覧を取得するディレクトリパス
   * @return {string[]}           配下のファイルパスの配列
   */
  private getFileList = (srcDirPath: string): string[] => {
    return this.getFileListRecursive(srcDirPath);
  };

  /**
   * 指定ディレクトリ配下のファイル一覧を再帰的に取得する
   * @param {string} srcDirPath   ファイル一覧を取得するディレクトリパス
   * @param {string} path         srcDirPath 以下のディレクトリパス
   * @return {string[]}           配下のファイルパスの配列
   */
  private getFileListRecursive = (srcDirPath: string, path: string = ''): string[] => {
    const result: string[] = [];
    const fileObj = fs.readdirSync(`${srcDirPath}/${path}`, { withFileTypes: true });
    fileObj.forEach(file => {
      if (file.isDirectory()) {
        this.getFileListRecursive(
          srcDirPath,
          path === '' ? file.name : `${path}/${file.name}`
        ).forEach(item => {
          result.push(item);
        });
      } else {
        result.push(path === '' ? file.name : `${path}/${file.name}`);
      }
    });

    return result;
  };
}
