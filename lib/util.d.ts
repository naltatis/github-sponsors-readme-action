import { ActionInterface } from './constants';
/**
 * Utility function that checks to see if a value is undefined or not.
 */
export declare const isNullOrUndefined: (value: string | undefined | null) => boolean;
/**
 * Verifies the action has the required parameters to run, otherwise throw an error.
 */
export declare const checkParameters: (action: ActionInterface) => void;
/**
 * Suppresses sensitive information from being exposed in error messages.
 */
export declare const suppressSensitiveInformation: (str: string, action: ActionInterface) => string;
/**
 * Extracts error message from an error.
 */
export declare const extractErrorMessage: (error: unknown) => string;
