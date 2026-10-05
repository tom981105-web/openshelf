# OpenShelf

Useful open-source apps, free web tools, and self-hosted software — organized in one place.

## v0.1

- Full-text search
- Category filters
- Open-source / free filters
- Platform filter
- Data-driven cards via `data/tools.json`
- Responsive layout
- GitHub Pages friendly: no build step required

## Run locally

Because tool data is loaded with `fetch`, run a tiny local HTTP server instead of opening `index.html` directly.

```bash
python -m http.server 8080
```

Then open `http://localhost:8080`.

## Add a tool

Add an item to `data/tools.json`:

```json
{
  "name": "Tool name",
  "description": "Short description",
  "category": "Category",
  "tags": ["tag1", "tag2"],
  "platforms": ["Web", "Windows"],
  "free": true,
  "openSource": true,
  "website": "https://example.com",
  "github": "https://github.com/example/project",
  "featured": 5
}
```

## Roadmap

- Tool detail pages
- Favorites / local bookmarks
- Alternative-tool relationships
- GitHub metadata sync
- User submissions via GitHub Issues
- Korean/English localization
- Recently added / trending sections

## License

MIT
