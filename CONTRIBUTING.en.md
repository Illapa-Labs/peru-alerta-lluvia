[Español](CONTRIBUTING.md) | **English**

# How to contribute

Thank you for wanting to help. This is a community open source project: it has no ads, it is not monetized, and it aims to be useful to people who live in or travel through areas of heavy rain in Peru.

By taking part you agree to follow the [Code of Conduct](CODE_OF_CONDUCT.en.md).

## What helps most

- Reporting bugs or data that looks wrong, with a screenshot and the place or district.
- Making the texts clearer: people read the warning in a hurry and on slow connections.
- Accessibility, and performance on phones and on 3G.
- Reviewing and documenting the licenses and attribution of the data sources.
- Code: small improvements and fixes.

## Before you start

1. Check whether an issue about the same thing already exists.
2. For a big change, open an issue first to discuss it so no work is lost.
3. Fork the repository, create a branch with a short name (`fix-district-list`) and send a pull request.

## Branches and workflow

We use [GitHub Flow](https://docs.github.com/en/get-started/using-github/github-flow): a single main branch and short branches for each change.

- `main` is the production branch: it must always build and be deployable. It is protected and nobody writes to it directly.
- There is no `develop` branch. Each change goes on a branch created from `main`, named `type/short-description`: `feat/district-list`, `fix/search-accents`, `docs/readme-update`.
- If you are not part of the team, work from your fork and send the pull request to `main`.
- Branches live for days, not weeks, and pull requests are small and have a single purpose.
- To merge, a pull request needs at least one approval and a passing automated check (types and build). It is merged with a squash merge, so the pull request title must follow Conventional Commits in English: it becomes the commit message on `main`.
- Once it is set up, every pull request will get a preview address to test the change on a real site before merging it.

## License of your contributions

The project is distributed under the [AGPL-3.0-or-later](LICENSE). By sending a contribution you agree that it is published under that same license. We do not ask you to assign your rights: you remain the author of what you write.

Do not include code or data that you cannot publish under the AGPL (for example, copied from a project with an incompatible license, or data without permission to redistribute). If in doubt, ask in the issue.

## Data and sources

- Do not add data without stating its source and license.
- The warnings come from SENAMHI and are shown as they are published. We do not present our own reading of them as official, and we do not change their level.
- No one's personal data goes in this repository.

## Code style

- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org) and are written in English, for example `feat(panel): add the district list`.
- Identifiers and technical comments are in English. A comment may be in Spanish when it explains a local rule (SENAMHI levels, ubigeo codes).
- Texts shown to people are set with `textContent`: external data is never interpreted as HTML.
- Before sending, check that the project builds and passes the type check (the exact commands will be listed here once the code is migrated).

## Security

If you find a security problem, do not publish it in an issue: write to contacto@illapalabs.org.
