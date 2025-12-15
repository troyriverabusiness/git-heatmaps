# git-heatmaps
Custom heatmap which uses Github and GitLab 

### Dev

Requirements:
- Node.js 20+

Commands:
- `npm install`
- `npm run dev`

Example requests:
- `GET /heatmap?provider=github&user=octocat`
- `GET /history?provider=gitlab&user=someUser`

### Docker

Run:
- `docker compose up --build`

Then hit:
- `GET http://localhost:3000/heatmap?provider=github&user=octocat`

Note: Endpoints currently return `501 not implemented` until sources + render are implemented.


### Docs

GitLab
https://docs.gitlab.com/api/events/#get-contribution-events-for-a-user

Github
https://docs.github.com/en/graphql/reference/objects#contributionscollection