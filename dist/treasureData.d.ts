import { AxiosInstance, AxiosRequestConfig } from 'axios';
export interface Option extends AxiosRequestConfig {
}
export declare type TreasureDataSecret = {
    API_TOKEN: string;
};
export declare type TreasureDataExecuteOutput = {
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
    createdAt: string;
    finishedAt: string;
};
export declare type TreasureDataGetStatusOutput = {
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
            last_session_time: string;
            next_session_time: string;
            last_executed_session_time: string;
        };
        createdAt: string;
        finishedAt: string;
    };
};
export declare type TreasureDataGetProjectsOutputElement = {
    id: string;
    name: string;
    revision: string;
    createdAt: string;
    updatedAt: string;
    deletedAt: string;
    archiveType: string;
    archiveMd5: string;
};
export declare class TreasureData {
    private axios;
    constructor(secret: TreasureDataSecret);
    /**
     * axiosにのオブジェクトインスタンスを取得する
     * テストでモックするときにこのメソッドを使用する
     * @return {AxiosInstance} axiosのオブジェクトインスタンス
     */
    getInstance: () => AxiosInstance;
    /**
     * Workflow を TreasureData 上にデプロイする
     */
    deployWorkflow: (srcDirPath: string, zipFilePath: string, projectName: string, revision?: string) => Promise<TreasureDataExecuteOutput>;
    /**
     * 指定の Workflow を実行する
     * @param {string} projectName  TreasureData Workflow の対象のプロジェクト名
     * @param {string} workflowName TreasureData Workflow の対象の Workflow 名
     * @return {Promise<TreasureDataExecuteOutput>}
     */
    executeWorkflow: (projectName: string, workflowName: string) => Promise<TreasureDataExecuteOutput>;
    /**
     * 指定した Workflow のステータスを取得する
     * @param {string} sessionId 指定する Workflow の Session ID
     * @return {Promise<TreasureDataExecuteOutput>}
     */
    getWorkflowStatus: (sessionId: string) => Promise<TreasureDataGetStatusOutput>;
    /**
     * 指定したプロジェクトの ID を取得する
     * @param {string} name 指定するプロジェクト名
     * @return {string}     プロジェクト ID。見つからなければ null を返す
     */
    getProjectId: (name: string) => Promise<string>;
    /**
     * 指定した workflow の ID を取得する
     * @param {string} name      指定する workflow 名
     * @param {string} projectId workflow が属するプロジェクトの ID
     * @return {string}          workflow の ID。見つからなければ null を返す
     */
    getWorkflowId: (name: string, projectId: string) => Promise<string>;
    /**
     * 指定したワークフロー定義ファイルを読み込んで gzip 圧縮
     * @param {string} srcDirPath  ワークフロー定義ファイルのパス
     * @return {Buffer}             圧縮されたワークフロー定義ファイルのデータ
     */
    private gzipDigFile;
    private getFileList;
    private getFileListRecursive;
}
