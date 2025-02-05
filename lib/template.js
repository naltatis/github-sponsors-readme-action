"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFile = exports.generateTemplate = exports.getSponsors = void 0;
require("cross-fetch/polyfill");
const fs_1 = require("fs");
const constants_1 = require("./constants");
const mustache_1 = require("mustache");
const util_1 = require("./util");
const core_1 = require("@actions/core");
/**
 * Fetches sponsors from the GitHub Sponsors API.
 */
function getSponsors(action) {
    return __awaiter(this, void 0, void 0, function* () {
        function buildQuery(cursor) {
            const after = cursor ? `after: "${cursor}", ` : '';
            return `query { 
      ${action.organization
                ? `organization (login: "${process.env.GITHUB_REPOSITORY_OWNER}")`
                : `viewer`} {
        login
        sponsorshipsAsMaintainer(first: 100, ${after}orderBy: {field: CREATED_AT, direction: ASC}) {
          totalCount
          pageInfo {
            endCursor
          }
          nodes {
            sponsorEntity {
              ... on Organization {
                name
                login
                url
                websiteUrl
              }
              ... on User {
                name
                login
                url
                websiteUrl
              }
            }
            createdAt
            privacyLevel
            tier {
              monthlyPriceInCents
            }
          }
        }
      }
    }`;
        }
        try {
            (0, core_1.info)(`Fetching data from the GitHub API as ${action.organization ? 'Organization' : 'User'}… ⚽`);
            let result = [];
            let morePages = true;
            let cursor = null;
            while (morePages) {
                const query = buildQuery(cursor);
                const data = yield fetch(`${constants_1.Urls.GITHUB_API}/graphql`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${action.token}`,
                        'Content-Type': 'application/json',
                        Accept: 'application/json'
                    },
                    body: JSON.stringify({ query })
                });
                const response = yield data.json();
                const responseData = action.organization
                    ? response.data.organization
                    : response.data.viewer;
                if (responseData === null || responseData === void 0 ? void 0 : responseData.sponsorshipsAsMaintainer) {
                    cursor = responseData.sponsorshipsAsMaintainer.pageInfo.endCursor;
                    result = result.concat(responseData.sponsorshipsAsMaintainer.nodes || []);
                    morePages =
                        responseData.sponsorshipsAsMaintainer.totalCount > result.length;
                }
            }
            return result;
        }
        catch (error) {
            throw new Error(`There was an error with the GitHub API request: ${(0, util_1.suppressSensitiveInformation)((0, util_1.extractErrorMessage)(error), action)} ❌`);
        }
    });
}
exports.getSponsors = getSponsors;
/**
 * Generates the sponsorship template.
 */
function generateTemplate(sponsors, action) {
    let template = ``;
    (0, core_1.info)(`Generating template with ${sponsors.length} sponsors … ✨`);
    if (sponsors.length) {
        /* Appends the template, the API call returns all users regardless of if they are hidden or not.
      In an effort to respect a users decision to be anonymous we filter these users out. */
        let filteredSponsors = sponsors.filter((user) => user.privacyLevel !== constants_1.PrivacyLevel.PRIVATE &&
            user.tier.monthlyPriceInCents >= action.minimum);
        if (action.maximum > 0) {
            filteredSponsors = filteredSponsors.filter((user) => user.tier.monthlyPriceInCents <= action.maximum);
        }
        /** If there are no valid sponsors then we return the provided fallback. */
        if (!filteredSponsors.length) {
            return action.fallback;
        }
        filteredSponsors.map(({ sponsorEntity }) => {
            sponsorEntity.websiteUrl = sponsorEntity.websiteUrl || sponsorEntity.url;
            template = template += (0, mustache_1.render)(action.template, sponsorEntity);
        });
    }
    else {
        (0, core_1.info)(`No sponsorship data was found… ❌`);
    }
    return template;
}
exports.generateTemplate = generateTemplate;
function generateFile(sponsors, action) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            (0, core_1.info)(`Generating updated ${action.file} file… 📁`);
            /** Replaces the content within the comments and re appends/prepends the comments to the replace for follow-up workflow runs. */
            const regex = new RegExp(`(<!-- ${action.marker} -->)[\\s\\S]*?(<!-- ${action.marker} -->)`, 'g');
            let data = yield fs_1.promises.readFile(action.file, 'utf8');
            if (!regex.test(data)) {
                return constants_1.Status.SKIPPED;
            }
            data = data.replace(regex, `$1${generateTemplate(sponsors, action)}$2`);
            yield fs_1.promises.writeFile(action.file, data);
            return constants_1.Status.SUCCESS;
        }
        catch (error) {
            throw new Error(`There was an error generating the updated file: ${(0, util_1.suppressSensitiveInformation)((0, util_1.extractErrorMessage)(error), action)} ❌`);
        }
    });
}
exports.generateFile = generateFile;
