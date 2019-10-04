# td-workflow-client

TreasureData クライアントライブラリです。

## 使い方

./src/treasureData.ts を Typescript で書かれたプロジェクトにインポートします。

## Digdag API の仕様を調べる

./docker ディレクトリ以下の Docker を使用することにより Digdag API の仕様を確認することができます。

### 起動

```shell
cd ./docker
docker-compose up -d
```

少し時間がかかります。

<http://localhost:8080> にアクセス

### 終了

```shell
docker-compose down
```
