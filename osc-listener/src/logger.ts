import winston from 'winston';
import path from 'path';
import { DebugLevel, defaultConfig } from './config';
import * as fs from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
const disableConsole = args.includes('--no-console');

// Determine log level from command line or config
const getLogLevel = () => {
    if (args.includes('--debug')) return 'debug';
    if (args.includes('--verbose')) return 'info';
    if (args.includes('--quiet')) return 'error';
    
    // No command line level specified, use config
    switch (defaultConfig.debug) {
        case DebugLevel.High:
            return 'debug';
        case DebugLevel.Medium:
            return 'info';
        case DebugLevel.Low:
            return 'info';
        case DebugLevel.None:
            return 'error';
        default:
            return 'info';
    }
};

const logLevel = getLogLevel();

// Parse log file path from arguments
const getLogFilePath = () => {
    const logFileIndex = args.indexOf('--log-file');
    if (logFileIndex !== -1 && args[logFileIndex + 1]) {
        return args[logFileIndex + 1];
    }
    return path.join(process.cwd(), 'logs', 'osc-listener.log');
};

const logFilePath = getLogFilePath();

// Create a temporary logger for setup errors
const setupLogger = winston.createLogger({
    level: 'error',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ 
            filename: logFilePath,
            maxsize: 5242880,
            maxFiles: 5,
            tailable: true
        })
    ]
});

// Ensure log directory exists
const logDir = path.dirname(logFilePath);
try {
    fs.mkdirSync(logDir, { recursive: true });
} catch (err) {
    setupLogger.error('Failed to create log directory', { error: err });
}

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

// Create transports array
const transports: winston.transport[] = [];

// Always add console transport for errors
transports.push(
    new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        ),
        level: 'error' // Only show errors in console
    })
);

// Add full console transport if not disabled
if (!disableConsole) {
    transports.push(
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
            level: logLevel // Show all levels in console
        })
    );
}

// Always add file transport
transports.push(
    new winston.transports.File({ 
        filename: logFilePath,
        maxsize: 5242880, // 5MB
        maxFiles: 5,
        tailable: true,
        level: 'debug' // Always log everything to file, let debugLog handle the filtering
    })
);

// Create the logger
const logger = winston.createLogger({
    level: 'debug', // Set to debug to allow all levels through, let debugLog handle filtering
    format: logFormat,
    transports
});

// Helper function to log based on debug level
export const debugLog = (level: DebugLevel, message: string, meta?: any) => {
    // Only log if the message's level is less than or equal to the current debug level
    if (level <= defaultConfig.debug) {
        switch (level) {
            case DebugLevel.High:
                logger.debug(message, meta);
                break;
            case DebugLevel.Medium:
                logger.info(message, meta);
                break;
            case DebugLevel.Low:
                logger.info(message, meta);
                break;
            case DebugLevel.None:
                // No logging
                break;
        }
    }
};

export default logger; 