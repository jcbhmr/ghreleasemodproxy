package main

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/google/go-github/v70/github"
)

type Info struct {
	Version string    // version string
	Time    time.Time // commit time
}

func main() {
	client := github.NewClient(nil)
	if githubToken, ok := os.LookupEnv("GITHUB_TOKEN"); ok {
		client = client.WithAuthToken(githubToken)
	}

	repositoriesListReleasesAll := func(ctx context.Context, owner, repo string) ([]*github.RepositoryRelease, error) {
		releasesAll := []*github.RepositoryRelease{}
		page := 1
		for {
			releases, resp, err := client.Repositories.ListReleases(ctx, owner, repo, &github.ListOptions{
				Page:    page,
				PerPage: 100,
			})
			if err != nil {
				return nil, err
			}
			releasesAll = append(releasesAll, releases...)
			if resp.NextPage == 0 {
				break
			}
			page = resp.NextPage
		}
		return releasesAll, nil
	}

	http.HandleFunc("GET /{owner}/{repo}/{rest...}", func(w http.ResponseWriter, r *http.Request) {
		pathQuery := r.URL.Path
		if r.URL.RawQuery != "" {
			pathQuery += "?" + r.URL.RawQuery
		}
		log.Printf("--> %s %s", r.Method, pathQuery)

		owner := r.PathValue("owner")
		if owner == "" {
			http.Error(w, "no {owner}", http.StatusBadRequest)
			return
		}

		repo := r.PathValue("repo")
		if repo == "" {
			http.Error(w, "no {repo}", http.StatusBadRequest)
			return
		}

		rest := r.PathValue("rest")
		if rest == "" {
			http.Error(w, "no {rest...}", http.StatusBadRequest)
			return
		}

		prefix := r.URL.Query().Get("prefix")

		atParts := strings.SplitN(rest, "/@", 2)
		if len(atParts) < 2 {
			http.Error(w, "no /@", http.StatusBadRequest)
			return
		}
		// modulePath := atParts[0]
		atPath := "/@" + atParts[1]

		mux := http.NewServeMux()
		mux.HandleFunc("GET /@v/list", func(w http.ResponseWriter, r *http.Request) {
			releasesAll, err := repositoriesListReleasesAll(r.Context(), owner, repo)
			if err != nil {
				http.Error(w, "failed to list releases: "+err.Error(), http.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "text/plain; charset=utf-8")
			for _, release := range releasesAll {
				if prefix != "" && !strings.HasPrefix(release.GetTagName(), prefix) {
					continue
				}
				w.Write([]byte(release.GetTagName() + "\n"))
			}
		})
		mux.HandleFunc("GET /@v/{versionAndSuffix}", func(w http.ResponseWriter, r *http.Request) {
			versionAndSuffix := r.PathValue("versionAndSuffix")
			if versionAndSuffix == "" {
				http.Error(w, "no {versionAndSuffix}", http.StatusBadRequest)
				return
			}

			if strings.HasSuffix(versionAndSuffix, ".info") {
				version := versionAndSuffix[:len(versionAndSuffix)-len(".info")]

				release, _, err := client.Repositories.GetReleaseByTag(r.Context(), owner, repo, version)
				if err != nil {
					http.Error(w, "failed to get release: "+err.Error(), http.StatusInternalServerError)
					return
				}

				json.NewEncoder(w).Encode(Info{
					Version: release.GetTagName(),
					Time:    release.GetPublishedAt().Time,
				})
				return
			} else if strings.HasSuffix(versionAndSuffix, ".mod") {
				version := versionAndSuffix[:len(versionAndSuffix)-len(".mod")]

				release, _, err := client.Repositories.GetReleaseByTag(r.Context(), owner, repo, version)
				if err != nil {
					http.Error(w, "failed to get release: "+err.Error(), http.StatusInternalServerError)
					return
				}

				var modDownloadURL string
				for _, asset := range release.Assets {
					if asset.GetName() == version+".mod" {
						modDownloadURL = asset.GetBrowserDownloadURL()
						break
					}
				}
				if modDownloadURL == "" {
					http.Error(w, "no "+version+".mod found", http.StatusNotFound)
					return
				}

				http.Redirect(w, r, modDownloadURL, http.StatusFound)
				return
			} else if strings.HasSuffix(versionAndSuffix, ".zip") {
				version := versionAndSuffix[:len(versionAndSuffix)-len(".zip")]

				release, _, err := client.Repositories.GetReleaseByTag(r.Context(), owner, repo, version)
				if err != nil {
					http.Error(w, "failed to get release: "+err.Error(), http.StatusInternalServerError)
					return
				}

				var zipDownloadURL string
				for _, asset := range release.Assets {
					if asset.GetName() == version+".zip" {
						zipDownloadURL = asset.GetBrowserDownloadURL()
						break
					}
				}
				if zipDownloadURL == "" {
					http.Error(w, "no "+version+".zip found", http.StatusNotFound)
					return
				}

				http.Redirect(w, r, zipDownloadURL, http.StatusFound)
				return
			} else {
				http.Error(w, "unknown /@v/{versionAndSuffix} suffix: "+versionAndSuffix, http.StatusBadRequest)
				return
			}
		})
		mux.HandleFunc("GET /@latest", func(w http.ResponseWriter, r *http.Request) {
			releasesAll, err := repositoriesListReleasesAll(r.Context(), owner, repo)
			if err != nil {
				http.Error(w, "failed to list releases: "+err.Error(), http.StatusInternalServerError)
				return
			}

			if len(releasesAll) == 0 {
				http.Error(w, "no releases found", http.StatusNotFound)
				return
			}

			var latestRelease *github.RepositoryRelease
			for _, release := range releasesAll {
				if release.GetPrerelease() {
					continue
				}
				latestRelease = release
				break
			}
			if latestRelease == nil {
				latestRelease = releasesAll[0]
			}

			json.NewEncoder(w).Encode(Info{
				Version: latestRelease.GetTagName(),
				Time:    latestRelease.GetPublishedAt().Time,
			})
		})

		r.URL.Path = atPath
		mux.ServeHTTP(w, r)
	})

	start(http.DefaultServeMux)
}
