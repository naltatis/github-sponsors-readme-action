import 'cross-fetch/polyfill';
import { ActionInterface, Sponsor, Status } from './constants';
/**
 * Fetches sponsors from the GitHub Sponsors API.
 */
export declare function getSponsors(action: ActionInterface): Promise<Sponsor[]>;
/**
 * Generates the sponsorship template.
 */
export declare function generateTemplate(sponsors: Sponsor[], action: ActionInterface): string;
export declare function generateFile(sponsors: Sponsor[], action: ActionInterface): Promise<Status>;
