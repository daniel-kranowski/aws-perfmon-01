export interface EnvConfig {
    cwmetricsCustomMetricNameNumEventRec: string,
    cwmetricsCustomMetricNameNumUserRec: string,
    cwmetricsCustomMetricNamePropDelay: string,
    cwmetricsCustomNamespace: string;
    dbConnectionLimit: number;
    dbEndpoint: string;
    dbName: string;
    dbPassword: string;
    dbPort: number;
    dbQueryTimeout: number;
    dbUsername: string;
    verbose: boolean;
}

export function parseEnv(env: any): EnvConfig {
    return {
        cwmetricsCustomMetricNameNumEventRec: env.CWMETRICS_CUSTOM_METRIC_NAME_NUM_EVENT_REC,
        cwmetricsCustomMetricNameNumUserRec: env.CWMETRICS_CUSTOM_METRIC_NAME_NUM_USER_REC,
        cwmetricsCustomMetricNamePropDelay: env.CWMETRICS_CUSTOM_METRIC_NAME_PROP_DELAY,
        cwmetricsCustomNamespace: env.CWMETRICS_CUSTOM_NAMESPACE,
        dbConnectionLimit: parseInt(env.DB_CONNECTION_LIMIT),
        dbEndpoint: env.DB_ENDPOINT,
        dbName: env.DB_NAME,
        dbPassword: env.DB_PASSWORD,
        dbPort: parseInt(env.DB_PORT),
        dbQueryTimeout: parseInt(env.DB_QUERY_TIMEOUT),
        dbUsername: env.DB_USERNAME,
        verbose: env.VERBOSE === 'true',
    }
}