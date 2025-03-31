# Go GitHub release module proxy

📂 Add a build step to your Go library and publish it as a GitHub release

## Usage

First you'll need a module path that lets you serve HTML. This probably means GitHub Pages.

<div><code>https://octocat.github.io/awesome/</code></div>

```html
<meta name="go-import" content="octocat.github.io/awesome mod https://goghr.jcbhmr.com/octocat/awesome">
```

Then you'll need to add `$version.mod` and `$version.zip` assets to your GitHub release (replace `$version` with the actual `v1.2.3` version). The `.mod` file is a regular Go module file. The `.zip` file is a [Module zip file](https://go.dev/ref/mod#zip-files) that contains the module's source code.

## Development

```sh
go run .
```

Site is hosted on Netlify.
