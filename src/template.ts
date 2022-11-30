import 'cross-fetch/polyfill'
import {promises} from 'fs'
import {ActionInterface, PrivacyLevel, Sponsor, Status, Urls} from './constants'
import {render} from 'mustache'
import {extractErrorMessage, suppressSensitiveInformation} from './util'
import {info} from '@actions/core'

/**
 * Fetches sponsors from the GitHub Sponsors API.
 */
export async function getSponsors(action: ActionInterface): Promise<Sponsor[]> {
  function buildQuery(cursor: null): string {
    const after = cursor ? `after: "${cursor}", ` : ''
    return `query { 
      ${
        action.organization
          ? `organization (login: "${process.env.GITHUB_REPOSITORY_OWNER}")`
          : `viewer`
      } {
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
    }`
  }

  try {
    info(
      `Fetching data from the GitHub API as ${
        action.organization ? 'Organization' : 'User'
      }… ⚽`
    )

    let result = []
    let morePages = true
    let cursor = null

    while (morePages) {
      const data = await fetch(`${Urls.GITHUB_API}/graphql`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${action.token}`,
          'Content-Type': 'application/json',
          Accept: 'application/json'
        },
        body: JSON.stringify({
          query: buildQuery(cursor)
        })
      })
      const response = await data.json()
      const responseData = action.organization
        ? response.data.organization
        : response.data.viewer
      if (responseData?.sponsorshipsAsMaintainer) {
        cursor = responseData.sponsorshipsAsMaintainer.pageInfo.endCursor
        result = result.concat(
          responseData.sponsorshipsAsMaintainer.nodes || []
        )
        morePages =
          responseData.sponsorshipsAsMaintainer.totalCount > result.length
      }
    }
    return result
  } catch (error) {
    throw new Error(
      `There was an error with the GitHub API request: ${suppressSensitiveInformation(
        extractErrorMessage(error),
        action
      )} ❌`
    )
  }
}

/**
 * Generates the sponsorship template.
 */
export function generateTemplate(
  sponsors: Sponsor[],
  action: ActionInterface
): string {
  let template = ``

  info('Generating template… ✨')

  if (sponsors.length) {
    /* Appends the template, the API call returns all users regardless of if they are hidden or not.
  In an effort to respect a users decision to be anonymous we filter these users out. */
    let filteredSponsors = sponsors.filter(
      (user: Sponsor) =>
        user.privacyLevel !== PrivacyLevel.PRIVATE &&
        user.tier.monthlyPriceInCents >= action.minimum
    )

    if (action.maximum > 0) {
      filteredSponsors = filteredSponsors.filter(
        (user: Sponsor) => user.tier.monthlyPriceInCents <= action.maximum
      )
    }

    /** If there are no valid sponsors then we return the provided fallback. */
    if (!filteredSponsors.length) {
      return action.fallback
    }

    filteredSponsors.map(({sponsorEntity}) => {
      sponsorEntity.websiteUrl = sponsorEntity.websiteUrl || sponsorEntity.url
      template = template += render(action.template, sponsorEntity)
    })
  } else {
    info(`No sponsorship data was found… ❌`)
  }

  return template
}

export async function generateFile(
  sponsors: Sponsor[],
  action: ActionInterface
): Promise<Status> {
  try {
    info(`Generating updated ${action.file} file… 📁`)

    /** Replaces the content within the comments and re appends/prepends the comments to the replace for follow-up workflow runs. */
    const regex = new RegExp(
      `(<!-- ${action.marker} -->)[\\s\\S]*?(<!-- ${action.marker} -->)`,
      'g'
    )
    let data = await promises.readFile(action.file, 'utf8')

    if (!regex.test(data)) {
      return Status.SKIPPED
    }

    data = data.replace(regex, `$1${generateTemplate(sponsors, action)}$2`)

    await promises.writeFile(action.file, data)

    return Status.SUCCESS
  } catch (error) {
    throw new Error(
      `There was an error generating the updated file: ${suppressSensitiveInformation(
        extractErrorMessage(error),
        action
      )} ❌`
    )
  }
}
