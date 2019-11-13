'use strict';
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const tar_1 = __importDefault(require("tar"));
const path_1 = __importDefault(require("path"));
const moment_1 = __importDefault(require("moment"));
const v4_1 = __importDefault(require("uuid/v4"));
const fs = __importStar(require("fs-extra"));
const axios_1 = __importDefault(require("axios"));
class TreasureDataError extends Error {
}
class TreasureData {
    constructor(secret) {
        /**
         * axiosにのオブジェクトインスタンスを取得する
         * テストでモックするときにこのメソッドを使用する
         * @return {AxiosInstance} axiosのオブジェクトインスタンス
         */
        this.getInstance = () => {
            return this.axios;
        };
        /**
         * Workflow を TreasureData 上にデプロイする
         */
        this.deployWorkflow = async (srcDirPath, zipFilePath, projectName, revision) => {
            const gzipData = await this.gzipDigFile(srcDirPath, zipFilePath);
            if (revision === undefined) {
                revision = v4_1.default();
            }
            let result;
            try {
                const option = {
                    baseURL: this.option.baseURL,
                    headers: {
                        AUTHORIZATION: this.option.headers['AUTHORIZATION'],
                        'Content-Type': 'application/gzip',
                        'Content-Encoding': 'gzip',
                        Accept: 'application/json'
                    }
                };
                result = await this.axios.put(`api/projects?project=${projectName}&revision=${revision}`, gzipData, option);
            }
            catch (error) {
                console.error(error);
            }
            if (result.status !== 200) {
                throw new TreasureDataError('サーバーのレスポンスが不正です。');
            }
            return result.data;
        };
        /**
         * 指定の Workflow を実行する
         * @param {string} projectName  TreasureData Workflow の対象のプロジェクト名
         * @param {string} workflowName TreasureData Workflow の対象の Workflow 名
         * @param {Date} scheduleDate   起動する日時 (option)
         * @return {Promise<TreasureDataExecuteOutput>}
         */
        this.executeWorkflow = async (projectName, workflowName, scheduleDate) => {
            const date = moment_1.default(scheduleDate);
            if (date.isBefore(moment_1.default())) {
                throw new TreasureDataError('予約日時が過去です。');
            }
            const projectId = await this.getProjectId(projectName);
            if (projectId === null) {
                throw new TreasureDataError('指定の Project 名が見つかりません。');
            }
            const workflowId = await this.getWorkflowId(workflowName, projectId);
            if (workflowId === null) {
                throw new TreasureDataError('指定の Workflow 名が見つかりません。');
            }
            const params = {
                sessionTime: moment_1.default(scheduleDate).toISOString(),
                workflowId: workflowId,
                params: {}
            };
            const result = await this.axios.put('api/attempts', params);
            if (result.status !== 200) {
                throw new TreasureDataError('サーバーのレスポンスが不正です。');
            }
            return result.data;
        };
        /**
         * 指定した Workflow のステータスを取得する
         * @param {string} sessionId 指定する Workflow の Session ID
         * @return {Promise<TreasureDataExecuteOutput>}
         */
        this.getWorkflowStatus = async (sessionId) => {
            const result = await this.axios.get(`api/sessions/${sessionId}`);
            if (result.status !== 200) {
                throw new TreasureDataError('サーバーのレスポンスが不正です。');
            }
            return result.data;
        };
        /**
         * 指定した Project にシークレットを登録する
         * @param {string} projectName TreasureData Workflow の対象のプロジェクト名
         * @param {string} secretKey   シークレットの識別子
         * @param {string} secretValue シークレットの値
         * @return {Promise<void>}
         */
        this.setSecret = async (projectName, key, value) => {
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
        this.getProjectId = async (name) => {
            const result = await this.axios.get('api/projects');
            if (result.status !== 200) {
                throw new TreasureDataError('サーバーのレスポンスが不正です。');
            }
            const json = result.data;
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
        this.getWorkflowId = async (name, projectId) => {
            const result = await this.axios.get(`api/projects/${projectId}/workflows`);
            if (result.status !== 200) {
                throw new TreasureDataError('サーバーのレスポンスが不正です。');
            }
            const json = result.data;
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
        this.gzipDigFile = async (srcDirPath, zipFilePath) => {
            // gzip 圧縮したファイルの保存先
            if (zipFilePath === undefined) {
                zipFilePath = process.cwd();
            }
            if (!fs.existsSync(srcDirPath)) {
                throw new TreasureDataError('指定されたワークフロー定義ファイルが見つかりません。');
            }
            const fileList = this.getFileList(srcDirPath);
            try {
                const destPath = path_1.default.parse(zipFilePath);
                fs.mkdirsSync(destPath.dir);
                await tar_1.default.create({
                    gzip: true,
                    cwd: srcDirPath,
                    file: zipFilePath,
                    portable: true
                }, fileList);
                return fs.readFileSync(zipFilePath);
            }
            catch (error) {
                throw new TreasureDataError(`指定されたワークフロー定義ファイルの gzip 圧縮に失敗しました。 error = ${error}`);
            }
        };
        /**
         * 指定ディレクトリ配下のファイル一覧を取得する
         * @param {string} srcDirPath   ファイル一覧を取得するディレクトリパス
         * @return {string[]}           配下のファイルパスの配列
         */
        this.getFileList = (srcDirPath) => {
            return this.getFileListRecursive(srcDirPath);
        };
        /**
         * 指定ディレクトリ配下のファイル一覧を再帰的に取得する
         * @param {string} srcDirPath   ファイル一覧を取得するディレクトリパス
         * @param {string} path         srcDirPath 以下のディレクトリパス
         * @return {string[]}           配下のファイルパスの配列
         */
        this.getFileListRecursive = (srcDirPath, path = '') => {
            const result = [];
            const fileObj = fs.readdirSync(`${srcDirPath}/${path}`, { withFileTypes: true });
            fileObj.forEach(file => {
                if (file.isDirectory()) {
                    this.getFileListRecursive(srcDirPath, path === '' ? file.name : `${path}/${file.name}`).forEach(item => {
                        result.push(item);
                    });
                }
                else {
                    result.push(path === '' ? file.name : `${path}/${file.name}`);
                }
            });
            return result;
        };
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
        this.axios = axios_1.default.create(this.option);
    }
}
exports.TreasureData = TreasureData;
