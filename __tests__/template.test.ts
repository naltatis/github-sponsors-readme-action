import {PrivacyLevel, Status, Urls, Sponsor} from '../src/constants'
import {generateFile, generateTemplate, getSponsors} from '../src/template'
import {promises} from 'fs'
import {info} from '@actions/core'
import nock from 'nock'

jest.setTimeout(60000)

jest.mock('@actions/core', () => ({
  info: jest.fn(),
  getInput: jest.fn()
}))

describe('template', () => {
  describe('generateTemplate', () => {
    it('should generate the default template', () => {
      const sponsors: Sponsor[] = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 5000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: 'https://jamesiv.es'
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 5000
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: 'https://jamesiv.es'
          }
        }
      ]

      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /><span>{{{ websiteUrl}}}</span></a>',
        minimum: 0,
        maximum: 0,
        marker: 'sponsors',
        organization: false,
        fallback: ''
      }

      expect(generateTemplate(sponsors, action)).toEqual(
        '<a href="https://github.com/JamesIves"><img src="https://github.com/JamesIves.png" width="60px" alt="" /><span>https://jamesiv.es</span></a><a href="https://github.com/MontezumaIves"><img src="https://github.com/MontezumaIves.png" width="60px" alt="" /><span>https://jamesiv.es</span></a>'
      )
    })

    it('should fallback to url if websiteUrl is not provided', () => {
      const sponsors: Sponsor[] = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 5000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: null
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 5000
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: null
          }
        }
      ]

      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="{{{ websiteUrl }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 0,
        maximum: 0,
        marker: 'sponsors',
        organization: false,
        fallback: ''
      }

      expect(generateTemplate(sponsors, action)).toEqual(
        '<a href="https://github.com/JamesIves"><img src="https://github.com/JamesIves.png" width="60px" alt="" /></a><a href="https://github.com/MontezumaIves"><img src="https://github.com/MontezumaIves.png" width="60px" alt="" /></a>'
      )
    })

    it('should filter out sponsors who are marked as private', () => {
      const sponsors: Sponsor[] = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 5000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: 'https://jamesiv.es'
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PRIVATE,
          tier: {
            monthlyPriceInCents: 5000
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: 'https://jamesiv.es'
          }
        }
      ]

      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 0,
        maximum: 0,
        marker: 'sponsors',
        organization: false,
        fallback: ''
      }

      expect(generateTemplate(sponsors, action)).toEqual(
        '<a href="https://github.com/JamesIves"><img src="https://github.com/JamesIves.png" width="60px" alt="" /></a>'
      )
    })

    it('should filter out sponsors who do not meet the minimum threshold', () => {
      const sponsors: Sponsor[] = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 6000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: 'https://jamesiv.es'
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 100
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: 'https://jamesiv.es'
          }
        }
      ]

      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 6000,
        maximum: 0,
        marker: 'sponsors',
        organization: false,
        fallback: ''
      }

      expect(generateTemplate(sponsors, action)).toEqual(
        '<a href="https://github.com/JamesIves"><img src="https://github.com/JamesIves.png" width="60px" alt="" /></a>'
      )
    })

    it('should filter out sponsors who are above the maximum threshold', () => {
      const sponsors: Sponsor[] = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 9000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: 'https://jamesiv.es'
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 11000
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: 'https://jamesiv.es'
          }
        }
      ]

      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 0,
        maximum: 10000,
        marker: 'sponsors',
        organization: false,
        fallback: ''
      }

      expect(generateTemplate(sponsors, action)).toEqual(
        '<a href="https://github.com/JamesIves"><img src="https://github.com/JamesIves.png" width="60px" alt="" /></a>'
      )
    })

    it('should only show sponsors who are above the minimum but below the maximum', () => {
      const sponsors: Sponsor[] = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 9000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: 'https://jamesiv.es'
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 12000
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: 'https://jamesiv.es'
          }
        }
      ]

      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 6000,
        maximum: 10000,
        marker: 'sponsors',
        organization: false,
        fallback: ''
      }

      expect(generateTemplate(sponsors, action)).toEqual(
        '<a href="https://github.com/JamesIves"><img src="https://github.com/JamesIves.png" width="60px" alt="" /></a>'
      )
    })

    it('should display the fallback if no sponsors match the parameters', () => {
      const sponsors: Sponsor[] = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 12000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: 'https://jamesiv.es'
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 12000
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: 'https://jamesiv.es'
          }
        }
      ]

      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 6000,
        maximum: 10000,
        marker: 'sponsors',
        organization: false,
        fallback: 'There are no sponsors in this tier'
      }

      expect(generateTemplate(sponsors, action)).toEqual(action.fallback)
    })
  })

  describe('generateFile', () => {
    it('should read an existing file and write to it without throwing', async () => {
      const sponsors: Sponsor[] = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 12000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: 'https://jamesiv.es'
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 12000
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: 'https://jamesiv.es'
          }
        }
      ]

      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 6000,
        maximum: 10000,
        marker: 'sponsors',
        organization: false,
        fallback: 'There are no sponsors in this tier'
      }

      // Write temp README file for testing
      await promises.writeFile(
        'README.test.md',
        'Generated README file for testing <!-- sponsors --><!-- sponsors --> - do not commit'
      )

      expect(await generateFile(sponsors, action)).toBe(Status.SUCCESS)
    })

    it('should go into a skipped state if there is no marker found in the template', async () => {
      const sponsors: Sponsor[] = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 12000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: 'https://jamesiv.es'
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 12000
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: 'https://jamesiv.es'
          }
        }
      ]

      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 6000,
        maximum: 10000,
        marker: 'sponsors',
        organization: false,
        fallback: 'There are no sponsors in this tier'
      }

      // Purposely write incorrect data
      await promises.writeFile(
        'README.test.md',
        'Generated README file for testing <!-- sponsorrrr --><!-- sponsors --> - do not commit'
      )

      expect(await generateFile(sponsors, action)).toBe(Status.SKIPPED)
    })

    it('should catch when a function throws an error', async () => {
      ;(info as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Mocked throw')
      })

      const sponsors: Sponsor[] = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 12000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: 'https://jamesiv.es'
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 12000
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: 'https://jamesiv.es'
          }
        }
      ]

      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 6000,
        maximum: 10000,
        marker: 'sponsors',
        organization: false,
        fallback: 'There are no sponsors in this tier'
      }

      try {
        await generateFile(sponsors, action)
      } catch (error) {
        expect(error instanceof Error && error.message).toBe(
          'There was an error generating the updated file: Mocked throw ❌'
        )
      }
    })
  })

  describe('getSponsors', () => {
    it('should return some data as user', async () => {
      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 6000,
        maximum: 10000,
        marker: 'sponsors',
        organization: false,
        fallback: 'There are no sponsors in this tier'
      }

      const nodes = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 5000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: 'https://jamesiv.es'
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 5000
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: 'https://jamesiv.es'
          }
        }
      ]

      const mockResponse = {
        data: {
          viewer: {
            sponsorshipsAsMaintainer: {
              totalCount: 2,
              pageInfo: {
                endCursor: 'MQ'
              },
              nodes
            }
          }
        }
      }

      nock(Urls.GITHUB_API).post('/graphql').reply(200, mockResponse)

      const data = await getSponsors(action)

      expect(data).toEqual(nodes)
    })

    it('should return some data as organization', async () => {
      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 6000,
        maximum: 10000,
        marker: 'sponsors',
        organization: true,
        fallback: 'There are no sponsors in this tier'
      }

      const nodes = [
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 5000
          },
          sponsorEntity: {
            name: 'James Ives',
            login: 'JamesIves',
            url: 'https://github.com/JamesIves',
            websiteUrl: 'https://jamesiv.es'
          }
        },
        {
          createdAt: '123',
          privacyLevel: PrivacyLevel.PUBLIC,
          tier: {
            monthlyPriceInCents: 5000
          },
          sponsorEntity: {
            name: 'Montezuma Ives',
            login: 'MontezumaIves',
            url: 'https://github.com/MontezumaIves',
            websiteUrl: 'https://jamesiv.es'
          }
        }
      ]

      const mockResponse = {
        data: {
          organization: {
            sponsorshipsAsMaintainer: {
              totalCount: 2,
              pageInfo: {
                endCursor: 'MQ'
              },
              nodes
            }
          }
        }
      }

      nock(Urls.GITHUB_API).post('/graphql').reply(200, mockResponse)

      const data = await getSponsors(action)

      expect(data).toEqual(nodes)
    })

    it('should handle paged sponsor data', async () => {
      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 6000,
        maximum: 10000,
        marker: 'sponsors',
        organization: true,
        fallback: 'There are no sponsors in this tier'
      }

      const sponsorOne = {
        createdAt: '123',
        privacyLevel: PrivacyLevel.PUBLIC,
        tier: {
          monthlyPriceInCents: 5000
        },
        sponsorEntity: {
          name: 'Montezuma Ives',
          login: 'MontezumaIves',
          url: 'https://github.com/MontezumaIves',
          websiteUrl: 'https://jamesiv.es'
        }
      }

      const firstResponse = {
        data: {
          organization: {
            sponsorshipsAsMaintainer: {
              totalCount: 2,
              pageInfo: {
                endCursor: 'N9A'
              },
              nodes: [sponsorOne]
            }
          }
        }
      }

      const sponsorTwo = {
        createdAt: '123',
        privacyLevel: PrivacyLevel.PUBLIC,
        tier: {
          monthlyPriceInCents: 5000
        },
        sponsorEntity: {
          name: 'James Ives',
          login: 'JamesIves',
          url: 'https://github.com/JamesIves',
          websiteUrl: 'https://jamesiv.es'
        }
      }

      const secondResponse = {
        data: {
          organization: {
            sponsorshipsAsMaintainer: {
              totalCount: 2,
              pageInfo: {
                endCursor: null
              },
              nodes: [sponsorTwo]
            }
          }
        }
      }

      nock(Urls.GITHUB_API)
        .post('/graphql', /first: 100, orderBy/)
        .reply(200, firstResponse)
      nock(Urls.GITHUB_API)
        .post('/graphql', /first: 100, after: \\"N9A\\", orderBy/)
        .reply(200, secondResponse)

      const data = await getSponsors(action)

      expect(data).toEqual([sponsorOne, sponsorTwo])
    })

    it('should appropriately handle an error', async () => {
      ;(info as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Mocked throw')
      })

      const action = {
        token: '123',
        file: 'README.test.md',
        template:
          '<a href="https://github.com/{{{ login }}}"><img src="https://github.com/{{{ login }}}.png" width="60px" alt="" /></a>',
        minimum: 6000,
        maximum: 10000,
        marker: 'sponsors',
        organization: true,
        fallback: 'There are no sponsors in this tier'
      }

      try {
        await getSponsors(action)
      } catch (error) {
        expect(error instanceof Error && error.message).toBe(
          'There was an error with the GitHub API request: Mocked throw ❌'
        )
      }
    })
  })
})
