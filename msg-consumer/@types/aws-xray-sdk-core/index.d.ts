declare module "aws-xray-sdk-core" {
    function captureAWS<T>(awsSdk: T): T;
}