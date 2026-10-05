# OpenShelf

Useful open-source apps, free web tools, and self-hosted software — organized in one place.

## v0.2

OpenShelf is evolving from a simple link directory into a browsable tool library.

### Features

- Full-text search
- Category chips
- Open-source / free / favorites filters
- Platform filter
- Featured / newest / name sorting
- Recent additions section
- Tool detail modal
- Similar-tool recommendations
- Local favorites saved in the browser
- Data-driven cards via `data/tools.json`
- Responsive desktop/mobile layout
- GitHub Pages friendly: no build step required

## Run locally

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Add a tool

Add an item to `data/tools.json`.

Required fields: `id`, `name`, `description`, `category`, `tags`, `platforms`, `free`, `openSource`, `added`.

Optional but recommended: `longDescription`, `license`, `website`, `github`, `featured`.

## Roadmap

- GitHub metadata sync
- User submissions through GitHub Issues
- Korean/English localization
- Dedicated category pages
- Trending / popular collections
- Better logo and preview image handling

## License

MIT
